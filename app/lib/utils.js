module.exports = {
  // Function to sort an array of objects by a common object key, in increasing order
  byField_increasing: function (field) {
    return function (a, b) {
      return ((a[field] < b[field]) ? -1 : ((a[field] > b[field]) ? 1 : 0));
    }
  },

  // Function to sort an array of objects by a common object key, in decreasing order
  byField_decreasing: function (field) {
    return function (a, b) {
      return ((a[field] > b[field]) ? -1 : ((a[field] < b[field]) ? 1 : 0));
    }
  },

  // A dictionary of locations that are used across all component and action type forms
  // Using this centralised dictionary allows locations to be consistently displayed in the DB interface
  dictionary_locations: {
    bnl: 'BNL',
    cambridge: 'Cambridge',
    cern: 'CERN',
    chicago: 'Chicago',
    cincinnati: 'Cincinnati',
    daresbury: 'Daresbury Factory',
    dsm: 'Durham Sheet Metal',
    fermilab: 'Fermilab',
    harvard: 'Harvard',
    in_transit: 'In Transit',
    installed_on_APA: 'Used / Installed on APA',
    isu: 'ISU',
    lancaster: 'Lancaster',
    lsu: 'LSU',
    manchester: 'Manchester',
    merlin: 'Merlin',
    rokeby: 'Rokeby',
    rejected: 'Rejected',
    sheffield: 'Sheffield',
    surf: 'SURF',
    sussex: 'Sussex',
    ukWarehouse: 'UK Warehouse',
    unknown: 'Unknown / Lost',
    williamAndMary: 'William and Mary',
    wisconsin: 'Wisconsin',
  },

  // A dictionary of DUNE PID 'component ID' strings for Geometry Boards, related to the board part numbers
  // Note that cover boards are not included (even though they do technically have DUNE PIDs), because they are not individually recorded in the DB ... either as components or during installation
  dictionary_geometryBoardPIDs: {
    '8760104': '00001',
    '8760034': '00002',
    '8760032': '00003',
    '8760109': '00003',
    '8760057': '00004',
    '8760111': '00004',
    '8760044': '00005',
    '8760059': '00006',
    '8760040': '00007',
    '8760042': '00008',
    '8760038': '00009',
    '8760115': '00010',
    '8760119': '00011',
    '8760123': '00012',
    '8760108': '00013',
    '8760116': '00014',
    '8760030': '00015',
    '8760107': '00015',
    '8760036': '00016',
    '8760026': '00017',
    '8760028': '00018',
    '8760024': '00019',
    '8760054': '00020',
    '8760113': '00020',
    '8760051': '00021',
    '8760062': '00022',
    '8760121': '00023',
    '8760122': '00024',
    '8760120': '00025',
  },

  // The dictionaries below list various groups of UK and US personnel, whose names should be entered as appropriate in various component and action type forms
  // Using these centralised dictionaries allows names to be consistently displayed in the DB interface, and also for them to be selected via drop-down menu when filling out the type forms
  // Note that for all dictionaries, past personnel must still be included - otherwise their names in older records will not display correctly

  // All technicians and other personnel at the UK and US APA factories
  dictionary_technicians: {
    vincentBaker: 'Vincent Baker',
    davidBanner: 'David Banner',
    jacobBirkenhead: 'Jacob Birkenhead',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    josephBradwell: 'Joseph Bradwell',
    daveBrown: 'Dave Brown',
    daveConnor: 'Dave Conner',
    markFarrell: 'Mark Farrell',
    benFurey: 'Ben Furey',
    lewisGannon: 'Lewis Gannon',
    wayneGreen: 'Wayne Green',
    thomasHanley: 'Thomas Hanley',
    nicholasHays: 'Nicholas Hays',
    adamJones: 'Adam Jones',
    mitchellKane: 'Mitchell Kane',
    darrenKaye: 'Darren Kaye',
    andrewKelly: 'Andrew Kelly',
    slawekKubecki: 'Slawek Kubecki',
    abbieLee: 'Abbie Lee',
    nigelLightbown: 'Nigel Lightbown',
    yinruiLui: 'Yinrui Liu',    // Key is misspelt (sorry Yinrui!), but correcting it would also require finding and changing any records where it has been used ... which is extremely difficult
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
    jamesMcNally: 'James McNally',
    gwennMouster: 'Gwenn Mouster',
    andrewNaylor: 'Andrew Naylor',
    jackNorwell: 'Jack Norwell',
    benjaminOye: 'Benjamin Oye',
    radosavPantelic: 'Radosav Pantelic',
    jordanRigby: 'Jordan Rigby',
    danielSalisbury: 'Daniel Salisbury',
    daveSim: 'Dave Sim',
    bjornStowell: 'Bjorn Stowell',
    stephenSumner: 'Stephen Sumner',
    chrisSutton: 'Chris Sutton',
    jasonThornhill: 'Jason Thornhill',
    oliverUnwin: 'Oliver Unwin',
    anthonyWatling: 'Anthony Watling',
    lewisWatson: 'Lewis Watson',
    kimWilliams: 'Kim Williams',
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // Personnel who are authorised to signoff on APA frames (all Frame Assembly workflow actions)
  dictionary_frameIntakeSignoff: {
    gedBell: 'Ged Bell',
    callumHolt: 'Callum Holt',
    gwennMouster: 'Gwenn Mouster',
    sotirisVlachos: 'Sotiris Vlachos',
    danWenman: 'Dan Wenman',
    kyleZeug: 'Kyle Zeug',
  },

  // Personnel who are authorised to signoff on APA frame NCR concessions ('Final Frame QA Checklist' Frame Assembly workflow actions)
  dictionary_frameNCRSignoff: {
    olgaBeltramello: 'Olga Beltramello',
    ericJames: 'Eric James',
    radosavPantelic: 'Radosav Pantelic',
  },

  // Frame Prep D-band personnel (prep-related APA Assembly workflow actions and 'Final Inspection' Grounding Mesh Panel actions)
  dictionary_dBandFramePrep: {
    edBlucher: 'Ed Blucher',
    wayneGreen: 'Wayne Green',
    nicholasHays: 'Nicholas Hays',
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
    danielSalisbury: 'Daniel Salisbury',
    kimWilliams: 'Kim Williams',
  },

  // Personnel who are authorised to signoff on tension control verification ('? Layer - Winding' APA Assembly workflow actions)
  dictionary_tensionControlSignoff: {
    vincentBaker: 'Vincent Baker',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    daveSim: 'Dave Sim',
  },

  // Personnel who are authorised to signoff on winder maintenance verification ('? Layer - Winding' APA Assembly workflow actions)
  dictionary_winderMaintenanceSignoff: {
    vincentBaker: 'Vincent Baker',
    daveBrown: 'Dave Brown',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    markFarrell: 'Mark Farrell',
    lewisGannon: 'Lewis Gannon',
    darrenKaye: 'Darren Kaye',
    andrewKelly: 'Andrew Kelly',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    daveSim: 'Dave Sim',
    stephenSumner: 'Stephen Sumner',
  },

  // Winding D-band personnel (winding-related APA Assembly workflow actions)
  dictionary_dBandWinding: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    markFarrell: 'Mark Farrell',
    lewisGannon: 'Lewis Gannon',
    darrenKaye: 'Darren Kaye',
    andrewKelly: 'Andrew Kelly',
    albertoMarchionni: 'Alberto Marchionni',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
  },

  // Post-Production D-band personnel (post-winding APA Assembly workflow actions and all APA Post Production workflow actions)
  dictionary_dBandPostProduction: {
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    danielSalisbury: 'Daniel Salisbury',
    jasonThornhill: 'Jason Thornhill',
  },

  // Yoke load test technicians at UW [not currently used, but keep for the future]
  dictionary_uwTechnicians: {

  },

  // Personnel who are authorised to signoff on hardware installation at UW [not currently used, but keep for the future]
  dictionary_uwInstallationSignoff: {
    joeMunski: 'Joe Munski',
  },

  // Personnel from the CERN Compliance Office ('APA Shipment Signoff and Transport' APA Post Production workflow actions)
  dictionary_cernComplianceOffice: {
    alexandreAcerraGil: 'Alexandre Acerra Gil',
    olgaBeltramello: 'Olga Beltramello',
    denisDiyakov: 'Denis Diyakov',
  },

  // Personnel who are authorised to signoff on APA shipment reception ('APA Shipment Reception' APA Post Production workflow actions)
  dictionary_apaShipmentReceptionSignoff: {
    alexandreAcerraGil: 'Alexandre Acerra Gil',
    brianRebel: 'Brian Rebel',
  },

  // Lead personnel at the UK and US APA factories (top-level signoffs in various APA Assembly and APA Post Production workflow actions)
  dictionary_apaFactoryLeads: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    albertoMarchionni: 'Alberto Marchionni',
    gwennMouster: 'Gwenn Mouster',
    radosavPantelic: 'Radosav Pantelic',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
    sotirisVlachos: 'Sotiris Vlachos',
  },
}
