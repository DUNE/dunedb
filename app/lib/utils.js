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

  // General technicians at the UK and US APA factories
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
    yinruiLui: 'Yinrui Lui',
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

  // Personnel who are authorised to sign-off on Grounding Mesh Panel intake
  dictionary_meshPanelIntakeSignoff: {
    nicholasHays: 'Nicholas Hays',
    grahamMitchell: 'Graham Mitchell',
    danielSalisbury: 'Daniel Salisbury',
    kimWilliams: 'Kim Williams',
  },

  // Personnel who are authorised to sign-off on APA frame intake (including both types of frame survey results)
  dictionary_frameIntakeSignoff: {
    gedBell: 'Ged Bell',
    callumHolt: 'Callum Holt',
    gwennMouster: 'Gwenn Mouster',
    sotirisVlachos: 'Sotiris Vlachos',
    danWenman: 'Dan Wenman',
    kyleZeug: 'Kyle Zeug',
  },

  // Personnel who are authorised to sign-off on APA frame NCR concessions
  dictionary_frameNCRSignoff: {
    olgaBeltramello: 'Olga Beltramello',
    ericJames: 'Eric James',
    radosavPantelic: 'Radosav Pantelic',
  },

  // Geometry board metrology technicians at Manchester
  dictionary_manchesterTechnicians: {
    hamzaNaseer: 'Hamza Naseer',
    taabishAhmed: 'Taabish Ahmed',
    jakeDeMaine: 'Jake De Maine',
  },

  // Personnel who are authorised to sign-off on tension controls
  dictionary_tensionControlSignoff: {
    vincentBaker: 'Vincent Baker',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
  },

  // Personnel who are authorised to sign-off on winder maintenance
  dictionary_winderMaintenanceSignoff: {
    vincentBaker: 'Vincent Baker',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    daveSim: 'Dave Sim',
  },

  // PCB technicians at UW
  dictionary_uwPCBTechnicians: {
    andyArbuckle: 'Andy Arbuckle',
    krishnaLakkaraju: 'Krishna Lakkaraju',
    marySeverson: 'Mary Severson',
    christineVerdico: 'Christine Verdico',
  },

  // Personnel who are authorised to approve PCBs at UW
  dictionary_uwPCBApproval: {
    andyArbuckle: 'Andy Arbuckle',
    pamMarrLaundrie: 'Pam Marr-Laundrie',
  },

  // Hardware installation technicians at UW
  dictionary_uwInstallationTechnicians: {

  },

  // Personnel who are authorised to approve hardware installation at UW
  dictionary_uwInstallationApproval: {
    joeMunski: 'Joe Munski',
  },

  // Lead personnel at the UK and US APA factories (also doubling for personnel who are authorised to sign-off on 'Assembled APA Quality Assurance Check' actions)
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

  // A list of Auth0 user IDs (across all DB instances that they have accounts on) for the personnel in the 'dictionary_apaFactoryLeads' dictionary above
  // Also included are the current DB admins, so they can have access for testing and debugging any issues
  listIDs_apaFactoryLeads: [
    'auth0|64567419151ddf91659e4f3a',                                                                     // Ed Blucher (Production)
    'auth0|66766bf5c413c4d216ce3066',                                                                     // Dave Brown (Production)
    'auth0|6467c2cd7446c74d64aa82f6',                                                                     // Alberto Marchionni (Production)
    'auth0|6283d0da53955b00670866fa',                                                                     // Gwenn Mouster (Production)
    'auth0|6543ac95a5b46c922b92fc5b',                                                                     // Radosav Pantelic (Production)
    'auth0|62cc5cd824d68a7b806288dc',                                                                     // Daniel Salisbury (Production)
    'auth0|660d6fdc89987529cfbb11d9',                                                                     // Stephen Sumner (Production)
    'auth0|6419d07e67b64413cd0679f5',                                                                     // Sotiris Vlachos (Production)
    'auth0|62c1f26dd68f53308071c91a', 'auth0|6247211d7ca173006f55b951',                                   // Brian Rebel (Staging, Production)
    'auth0|62366229e644f4006ff1b144', 'auth0|6236627bcd1229006a1e5c54', 'auth0|623662b39e63f500683a210f', // Krish Majumdar (Staging, Production, Development)
  ],
}
