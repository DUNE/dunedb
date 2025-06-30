const router = require('express').Router();

const Components = require('../../lib/Components');
const logger = require('../../lib/logger');
const utils = require('../../lib/utils');


/// List general technicians at the UK and US APA factories
router.get('/technicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_technicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_technicians[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on Grounding Mesh Panel intake
router.get('/meshPanelIntakeSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_meshPanelIntakeSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_meshPanelIntakeSignoff[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on APA frame intake (including both types of frame survey results)
router.get('/frameIntakeSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_frameIntakeSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_frameIntakeSignoff[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on APA frame NCR concessions
router.get('/frameNCRSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_frameNCRSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_frameNCRSignoff[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List geometry board metrology technicians at Manchester
router.get('/manchesterTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_manchesterTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_manchesterTechnicians[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on tension controls
router.get('/tensionControlSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_tensionControlSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_tensionControlSignoff[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to sign-off on winder maintenance
router.get('/winderMaintenanceSignoff.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_winderMaintenanceSignoff) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_winderMaintenanceSignoff[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List PCB technicians at UW
router.get('/uwPCBTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwPCBTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwPCBTechnicians[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to approve PCBs at UW
router.get('/uwPCBApproval.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwPCBApproval) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwPCBApproval[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List hardware installation technicians at UW
router.get('/uwInstallationTechnicians.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwInstallationTechnicians) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwInstallationTechnicians[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List personnel who are authorised to approve hardware installation at UW
router.get('/uwInstallationApproval.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_uwInstallationApproval) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_uwInstallationApproval[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// List lead personnel at the UK and US APA factories
router.get('/apaFactoryLeads.json', async function (req, res, next) {
  try {
    let data = [];

    for (const person in utils.dictionary_apaFactoryLeads) {
      data.push({
        api_name: person,
        display_name: utils.dictionary_apaFactoryLeads[person],
      });
    }

    return res.status(201).json(data);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


/// ADMINISTRATOR UTILITY ... run a specific server-side library function appropriate for the currently required utility, with user input supplied from the Administrator Utility interface page 
router.post('/administratorUtility/:inputString', async function (req, res, next) {
  try {
    logger.info(req.body, 'Submission to /administratorUtility');

    const result = await Components.setComponentNames(req.params.inputString);    // Change as appropriate for the required utility

    return res.status(201).json(result);
  } catch (err) {
    logger.info({ route: req.route.path }, err.message);
    res.status(500).json({ error: err.toString() });
  }
});


module.exports = router;
