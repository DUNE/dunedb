module.exports = {
  // A 36 character long full UUID, of the form: [8]-[4]-[4]-[4]-[12]
  uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',

  // A 20 to 22 character long shortened UUID
  short_uuid_regex: ':shortuuid([0-9a-bA-Z-]{20,22})',

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
    sheffield: 'Sheffield',
    surf: 'SURF',
    sussex: 'Sussex',
    ukWarehouse: 'UK Warehouse',
    williamAndMary: 'William and Mary',
    wisconsin: 'Wisconsin',
  },

  // The dictionaries below list various groups of UK and US personnel, whose names should be entered as appropriate in various component and action type forms
  // Using these centralised dictionaries allows names to be consistently displayed in the DB interface, and also for them to be selected via drop-down menu when filling out the type forms

  // A dictionary of UK and US technicians 
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
    darrenKaye: 'Darren Kaye',
    andrewKelly: 'Andrew Kelly',
    slawekKubecki: 'Slawek Kubecki',
    yinruiLui: 'Yinrui Lui',
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
    jamesMcNally: 'James McNally',
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
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // A dictionary of lead personnel at the UK and US APA factories
  dictionary_apaFactoryLeads: {
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    radosavPantelic: 'Radosav Pantelic',
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // A list of Auth0 user IDs (across all DB instances that they have accounts on) for the personnel in the 'dictionary_apaFactoryLeads' dictionary above
  // Also included are the current DB admins, so they can have access for testing and debugging any issues
  listIDs_apaFactoryLeads: [
    'auth0|64567419151ddf91659e4f3a',                                                                     // Ed Blucher (Production)
    'auth0|6467c2cd7446c74d64aa82f6',                                                                     // Alberto Marchionni (Production)
    'auth0|6543ac95a5b46c922b92fc5b',                                                                     // Radosav Pantelic (Production)
    'auth0|6419d07e67b64413cd0679f5',                                                                     // Sotiris Vlachos (Production)
    'auth0|62c1f26dd68f53308071c91a', 'auth0|6247211d7ca173006f55b951',                                   // Brian Rebel (Staging, Production)
    'auth0|62366229e644f4006ff1b144', 'auth0|6236627bcd1229006a1e5c54', 'auth0|623662b39e63f500683a210f', // Krish Majumdar (Staging, Production, Development)
  ],

  // A dictionary of personnel who are authorised to sign-off on tension controls
  dictionary_tensionControlSignoff: {
    vincentBaker: 'Vincent Baker',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
  },

  // A dictionary of personnel who are authorised to sign-off on winder maintenance
  dictionary_winderMaintenanceSignoff: {
    vincentBaker: 'Vincent Baker',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    daveSim: 'Dave Sim',
  },

  // A dictionary of personnel who are authorised to sign-off on APA frame and grounding mesh intake (including both types of frame survey results)
  dictionary_frameIntakeSignoff: {
    gedBell: 'Ged Bell',
    callumHolt: 'Callum Holt',
    gwennMouster: 'Gwenn Mouster',
    sotirisVlachos: 'Sotiris Vlachos',
    kyleZeug: 'Kyle Zeug',
  },
}
