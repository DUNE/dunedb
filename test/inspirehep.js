#!/usr/bin/env node 
"use strict";

var request = require('request');
var util    = require('util');
var SietchConnect = require('../client/SietchConnect.js');

var arequest = util.promisify(request);
var sietch = new SietchConnect(
{
  "url": "http://localhost:12313",
  "client_credentials": {
    "user_id": "m2m3e36a366c56b139b",
    "secret": "secreta0f760f1d15a7691bdbb3fce3e3209e767678ed746c6dcbbb87f38bd961aabfc3fc605d2972d4ee11ab1c1b2a09d37a3047ee8f51d46478898839bfb7892ab59"
  }
});

var delayTimer = new Date();
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function inspire(route)
{
  var now = new Date();
  if(now - delayTimer < 2100) {
    // need to wait.
    console.log("waiting...")
    await sleep(2100-(now-delayTimer));
  }
  delayTimer = now;
  console.log("Querying",route);
  var response = await arequest({method:"get", url:"https://inspirehep.net/api"+route});
  return JSON.parse(response.body);
}

function clean_object(obj)
{
  try{
    if(typeof obj == "object") {
      for(var key in obj) {
        if(typeof obj[key] == "object") clean_object(obj[key]);
        if(key.startsWith('$')) {
          obj[key.substr(1)] = obj[key],
          delete obj[key]
        }
      }    
    }
    return obj;
  } catch (e) {
    console.log(obj);
    throw e;
  }
}


async function main()
{
  await sietch.connect();

  var lookup = {};
  var people_to_do = ["Nathaniel.J.Tagg.1"];
  var people_done = [];


  async function getPerson(bai) {
     console.log("---- PERSON ---- ",bai);
     var searchurl = "/literature?sort=mostrecent&size=300&q=a+"+bai;
     var done = false;
     while(!done) {
       var doc = await inspire(searchurl);
       if(!doc.hits) break;
       for(var paper of doc.hits.hits) {
        await doPaper(paper)
       }
       if(doc.links.next) searchurl = /.*\/api(.*)/.exec(doc.links.next)[1];
       else               done = true;
       sietch.report();
    }
     people_done.push(bai);
  }

  async function doPaper(paper) {
    try{
      var url = paper.links.json;
      // does this paper already exist?
      var matches = await sietch.post("/search/component/Paper?limit=1",{"data.url":url});

      // Queue all authors for recursion.
      for(var author of paper.metadata.authors) {
        if(!people_to_do.includes(author.bai)) people_to_do.push(author.bai);
      }

      if(matches.length>0) return; // We've done this one.
      // if(lookup[url]) return;
      // lookup[url] = await sietch.get("/generateComponentUuid");
      var paper_uuid = await sietch.get("/generateComponentUuid");
      // console.log(lookup[url],"--->",url);
      // then store.
      console.log("Storing paper",paper.metadata.titles[0].title)
      // console.log("keys in paper.metadata:",Object.keys(paper.metadata).join(','))
      var sietch_paper = {
        type: "Paper",
        data: {
          url: url,
          name: paper.metadata.titles[0].title,
          authors: [],
          ...clean_object((paper.metadata.publication_info||[])[0])
        }
      }; 
      // ...

      for(var author of paper.metadata.authors) {
        var bai = author.bai;
        if(!people_to_do.includes(bai)) people_to_do.push(bai);

        // does this author already exist in the DB?
        var matches = await sietch.post("/search/component/Author?limit=1",{"data.bai":bai});
        // console.log(`search for author ${author.bai} matches:`,matches);
        if(matches.length>0) {
          var author_uuid = matches[0].componentUuid;
        } else {
          // console.log("matches")
          var author_uuid = await sietch.get("/generateComponentUuid");
          // lookup[url] = paper_uuid;
          if(!author.record) continue;
          var authorUrl = author.record["$ref"];
          // then store author data.
          var sietch_author = {
            type: "Author",
            data: {
              name: author.full_name,
              bai: author.bai,
              url: (author.record||{}).$ref,
            }
          };
          console.log("Storing author",author.full_name);

          sietch.post(`/component/${author_uuid}`,sietch_author)
        }
        sietch_paper.data.authors.push({componentUuid:author_uuid});

        // var need_to_do = true;
        // if(!people_to_do.includes(bai)) people_to_do.push(bai);
        // if(lookup[bai]) need_to_do=false; // done this one.
        // else lookup[bai] = await sietch.get("/generateComponentUuid");

        // // record this person as author.
        // sietch_paper.data.authors.push({componentUuid:lookup[bai]});

        // console.log(lookup[bai],"--->",bai);
        // if(!author.record) continue;
        // var authorUrl = author.record["$ref"];
        // // then store author data.
        // var sietch_author = {
        //   type: "Author",
        //   data: {
        //     name: author.full_name,
        //     bai: author.bai,
        //     url: (author.record||{}).$ref,
        //   }
        // };
        // sietch.post(`/component/${lookup[bai]}`,sietch_author)
      }
      sietch.post(`/component/${paper_uuid}`,sietch_paper);

      } catch(e) {
        console.log(e);
        console.log(e.trace);
        throw e;
      }

    }

    while(people_to_do.length>0){
      var bai = people_to_do.shift()
      if(!people_done.includes(bai)) await getPerson(bai);
      console.log("people to do",people_to_do);
    }
}


main();