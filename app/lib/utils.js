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
    daresbury: 'Daresbury Factory',
    fermilab: 'Fermilab',
    harvard: 'Harvard',
    in_transit: 'In Transit',
    installed_on_APA: 'Used / Installed on APA',
    lancaster: 'Lancaster',
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
    andrewKelly: 'Andrew Kelly',
    slawekKubecki: 'Slawek Kubecki',
    yinruiLui: 'Yinrui Lui',
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
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

  // A dictionary of personnel who are authorised to sign-off on APA frame and grounding mesh intake (including frame intake survey results)
  dictionary_frameIntakeSignoff: {
    gedBell: 'Ged Bell',
    callumHolt: 'Callum Holt',
  },

  // A dictionary of personnel who are authorised to sign-off on APA frame installation survey results
  dictionary_frameInstallationSignoff: {
    olgaBeltramello: 'Olga Beltramello',
    denisDiyakov: 'Denis Diyakov',
  },
}
