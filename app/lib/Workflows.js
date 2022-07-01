'use strict';

const Cache = require('lib/Cache.js');
const commonSchema = require('lib/commonSchema.js');
const Components = require('lib/Components.js')('component');
const { db } = require('./db');
const dbLock = require('lib/dbLock.js');
const Forms = require('lib/Forms.js');
const permissions = require('lib/permissions.js');

module.exports = {
    save, 
    retrieve, 
    list, 
    evaluate, 
    getWorkflowForComponentFormId, 
    nextStep, 
    tags
}

async function save(input, req) {
    if(!input) {
        throw new Error("Workflows::save() - the 'input' object has not been specified!");
    }
    
    if(!input.workflowId) {
        throw new Error("Workflows::save() - the 'input.workflowId' has not been specified!");
    }
    
    if(!input.formId) {
        throw new Error("Workflows::save() - the 'input.formId' has not been specified!");
    }
    
    if(!input.componentFormId) {
        throw new Error("Workflows::save() - the 'input.componentFormId' has not been specified!");
    }
    
    if(!input.path) {
        throw new Error("Workflows::save() - the 'input.path' has not been specified!");
    }
    
    function checkPath(path) {
        for(var step of path) {
            if(!step.type) {
                throw new Error("Workflows::save() - the 'step.type' has not been specified!");
            }
            
            if(step.type === 'path') {
                checkPath(step.path);
            } else {
                if(!step.formId) {
                    throw new Error("Workflows::save() - the 'step.type' is not 'path', and 'step.formId' has not been specified!");
                }
                
                if(step.type === 'component' || step.type === 'job') {
                    if(!step.identifier || step.identifier.length < 1) {
                        throw new Error("Workflows::save() - the identifier in 'step.formId = " + step.formId + " has not been specified!");
                    }
                }
            }
        }
    }
    
    checkPath(input.path);
    
    var _lock = await dbLock('save workflow ' + input.id, 1000);
    var old = await retrieve(input.id);
    
    var record = {...input};
    record.recordType = 'workflow';
    record.insertion = commonSchema.insertion(req);
    record.validity = commonSchema.validity(record.validity, old);
    record.validity.ancestor_id = record._id;
    
    delete record._id;
    
    if(!permissions.hasPermission(req, 'workflows:edit')) {
        throw new Error("Workflows::save() - you don't have permission [workflows:edit] to edit workflows!");
    }
    
    var result = await db.collection('workflows')
                         .insertOne(record);
    
    _lock.release();
    
    if(result.insertedCount !== 1) {
        throw new Error("Workflows::save() - failed to insert a new workflow record into the database!");
    }
    
    Cache.invalidate('workflowsTags');
    
    return result.ops[0];
}

async function retrieve(workflowId, options) {
    var query = {workflowId};
    
    if(!query.workflowId) {
        throw new Error("Workflows::retrieve() - the workflow ID has not been specified!");
    }
    
    options = options || {};
    
    if(options.rollbackDate) {
        query["insertion.insertDate"] = {$lt: new Date(options.rollbackDate)};
    }
    
    if(options.onDate) {
        query["validity.startDate"] = {$lt: new Date(options.onDate)};
    }
    
    if(options.version) {
        query["validity.version"] = options.version;
    }
    
    if(options.id) {
        query["_id"] = ObjectID(options.id);
    }
    
    var items = await db.collection('workflows')
                        .find(query)
                        .sort({"validity.version": -1})
                        .limit(1)
                        .toArray();
    
    if(items.length < 1) {
        return null;
    }
    
    return items[0];
}

async function list(match_condition, options) {
    var aggregation_stages = [];
    
    if(match_condition) {
        aggregation_stages.push({
            $match: match_condition
        });
    }
    
    aggregation_stages.push({
        $sort: {"validity.startDate" : -1}
    });
    
    aggregation_stages.push({
        $group: {
            _id: {workflowId: "$workflowId"},
            workflowId: { "$first": "$workflowId" },
            formId: { "$first": "$formId" },
            name: { "$first": "$name" },
            componentFormId:{ "$first": "$componentFormId" },
            tags: { "$first": "$tags" }
        }
    });
    
    aggregation_stages.push({
        $sort: {last_edited : -1}
    });
    
    if (options) {
      if(options.second_selection) {
        aggregation_stages.push({
            $match: options.second_selection
        });
      }
    
      if(options.skip) {
          aggregation_stages.push({
              $skip: options.skip
          });
      }
      
      if(options.limit) {
          aggregation_stages.push({
              $limit: options.limit
          });
      }
    }
    
    var items = await db.collection('workflows')
                        .aggregate(aggregation_stages)
                        .toArray();
    
    return items;
}

async function evaluatePath(path, entityId) {
    var result  = [];
    
    for(var step of path) {
        var item = {...step};
        
        item.result = [];
        
        if(step.type === 'component') {
            var match = {};
            
            match[step.identifier] = entityId;
            match.formId = step.formId;
            
            item.result = await Components.search(null, match);
            item.meta = (await Forms.list('componentForms'))[step.formId];
        }
        
        result.push(item);
    }
    
    return result;
}

async function getNextStep(path, firstUnfinished) {
    // TODO(nathanieltagg): does not deal correctly with recursive paths
    
    if(firstUnfinished) {
        for(var step of path) {
            if(!step.result || step.result.length == 0) {
                return step;
            }
        }
        
        return {done: "All workflow path steps have been completed!"};

    } else {
        var next_step = null;
        
        for(var i = path.length - 1; i >= 0; i--) {
            if(path[i].result.length == 0) {
                if(i == 0) {
                    return path[i];
                }
                
                if(path[i - 1].result.length > 0) {
                    return path[i];
                }
            }
        }
        
        return {done: "All workflow path steps have been completed!"};
    }
}

async function evaluate(workflowId, entityId) {
    var workflow = await retrieve(workflowId);
    
    if(!workflow) {
        throw new Error("Workflows::evaluate()  - there is no DB entry for a workflow with ID: " + workflowId);
    }
    
    var result = {...workflow};
    result.evaluation = await evaluatePath(workflow.path, entityId);
    
    var score = 0;
    var denominator = 0;
    var mostRecent = new Date(0);
    
    for(var step of result.evaluation) {
        if(step.result && step.result.length > 0) {
            score++;
        }
        
        denominator++;
        
        for(var r of step.result) {
            if(r.insertion.insertDate > most_recent) {
                mostRecent = r.insertion.insertDate;
            }
        }
    }
    
    result.score = score;
    result.score_denominator = denominator;
    result.most_recent = mostRecent;
    result.next_step = getNextStep(result.evaluation);
    result.recordType = 'evaluatedWorkflow';
    
    return result;
}

async function getWorkflowForComponentFormId(formId) {
    var workflowsList = await list();
    
    for(var workflowId in workflowsList) {
        if(workflowsList[workflowId].componentFormId === formId) {
            return workflowId;
        }
    }
    
    return null;
}

async function nextStep(workflowId, uuid, firstUnfinished) {
    if(!workflowId && uuid) {
        var component = await Components.retrieve(uuid);
        workflowId = getWorkflowForComponentFormId(component.formId);
        
        if(!workflowId) {
            throw new Error("Workflows::nextStep() - no workflow ID has been specified or can be found via the specified component UUID!");
        }
    }
    
    var workflow = await retrieve(workflowId);
    
    if(workflowId && !uuid) {
        return workflow.path[0];
    }
    
    var evaluatedPath = await evaluatePath(workflow.path, uuid);
    
    return getNextStep(evaluatedPath, firstUnfinished);
}

Cache.add('workflowsTags', async function() {
    var tagsList = await Promise.all([db.collection('workflows')
                                        .distinct('tags')]);
    
    var tokens = {};
    
    for(var arr of tagsList) {
        tokens = arr.reduce((acc, curr) => (acc[curr] = 1, acc), tokens);
    }
    
    delete tokens.Trash;
    return Object.keys(tokens);
});

async function tags() {
    Cache.invalidate('workflowsTags');
    return await Cache.current('workflowsTags');
}
