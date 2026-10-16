module.exports = {
  ////////////////////////
  // INTERNAL FUNCTIONS //
  ////////////////////////
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


  /////////////////////////
  // MISCELLANEOUS LISTS //
  /////////////////////////
  // Locations (used to translate between strings stored in component and action records [the keys] and strings used for display in the interface [the values])
  // This list should include any and all locations across the shorter, bespoke lists found in various component and action type forms
  dictionary_locations: {
    bnl: 'BNL',
    cambridge: 'Cambridge',
    cern: 'CERN',
    chicago: 'Chicago',
    cincinnati: 'Cincinnati',
    daresbury: 'Daresbury Factory',
    dsm: 'Durham Sheet Metal',
    evt: 'EGKENN Vacuum Technology',
    fermilab: 'Fermilab',
    harvard: 'Harvard',
    in_transit: 'In Transit',
    installed_on_APA: 'Used / Installed on APA',
    isu: 'ISU',
    lancaster: 'Lancaster',
    lsu: 'LSU',
    manchester: 'Manchester',
    merlin: 'Merlin',
    rokeby: 'Rokeby',    // This is only used in Grounding Mesh Panel actions, but is apparently the same real-world location as 'UK Warehouse' ... can be combined?
    rejected: 'Rejected',
    sheffield: 'Sheffield',
    sdWarehouse: 'South Dakota Warehouse',
    surf: 'SURF',
    sussex: 'Sussex',
    ukWarehouse: 'UK Warehouse',
    unknown: 'Unknown / Lost',
    williamAndMary: 'William and Mary',
    wisconsin: 'Wisconsin',
  },

  // DUNE PID 'component ID' strings for Geometry Boards, related to the board part numbers (used for setting the 'DUNE PID' of Geometry Board components at component creation)
  // Cover Boards are not included (even though they do technically have DUNE PIDs), because they are not individually recorded in the DB ... either as components or during installation
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

  // Wire Spool Manufacturers (used for setting the 'component name' of Wire Bobbin components at component creation)
  dictionary_wireSpoolManufacturers: {
    littleFalls: 'Little Falls',
    rstLocker: 'RST/Locker',
    wireAlloyInternational: 'Wire Alloy Intl.',
    fiskAlloy: 'Fisk Alloy',
    newLfa: 'Little Falls (NEW)',
  },


  /////////////////////
  // PERSONNEL LISTS //
  /////////////////////
  // Each personnel list below should have two versions - one for 'current' personnel, and one for 'former' personnel

  // Technicians and other 'shop-floor' personnel at the UK and US APA Factories
  dictionary_technicians_current: {
    vincentBaker: 'Vincent Baker',
    davidBanner: 'David Banner',
    cernStaff: 'CERN Staff',
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    markFarrell: 'Mark Farrell',
    lewisGannon: 'Lewis Gannon',
    wayneGreen: 'Wayne Green',
    rowanGreenhalgh: 'Rowan Greenhalgh',
    nicholasHays: 'Nicholas Hays',
    robJones: 'Rob Jones',
    mitchellKane: 'Mitchell Kane',
    darrenKaye: 'Darren Kaye',
    nigelLightbown: 'Nigel Lightbown',
    yinruiLui: 'Yinrui Liu',    // Key is misspelt (sorry Yinrui!), but correcting it would also require finding and changing any records where it has been used ... which is extremely difficult
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
    jamesMcNally: 'James McNally',
    gwennMouster: 'Gwenn Mouster',
    jackNorwell: 'Jack Norwell',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    bjornStowell: 'Bjorn Stowell',
    stephenSumner: 'Stephen Sumner',
    chrisSutton: 'Chris Sutton',
    jasonThornhill: 'Jason Thornhill',
    douglasTsim: 'Douglas Tsim',
    lewisWatson: 'Lewis Watson',
  },

  dictionary_technicians_former: {
    jacobBirkenhead: 'Jacob Birkenhead',
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    josephBradwell: 'Joseph Bradwell',
    daveConnor: 'Dave Conner',
    benFurey: 'Ben Furey',
    thomasHanley: 'Thomas Hanley',
    adamJones: 'Adam Jones',
    andrewKelly: 'Andrew Kelly',
    slawekKubecki: 'Slawek Kubecki',
    abbieLee: 'Abbie Lee',
    stephenMcNally: 'Stephen McNally',
    andrewNaylor: 'Andrew Naylor',
    radosavPantelic: 'Radosav Pantelic',
    jordanRigby: 'Jordan Rigby',
    daveSim: 'Dave Sim',
    oliverUnwin: 'Oliver Unwin',
    anthonyWatling: 'Anthony Watling',
    kimWilliams: 'Kim Williams',
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // Personnel who are authorised to signoff on APA frames (all Frame Assembly workflow actions)
  dictionary_frameIntakeSignoff_current: {
    gedBell: 'Ged Bell',
    callumHolt: 'Callum Holt',
    gwennMouster: 'Gwenn Mouster',
    danWenman: 'Dan Wenman',
    kyleZeug: 'Kyle Zeug',
  },

  dictionary_frameIntakeSignoff_former: {
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // Personnel who are authorised to signoff on APA frame NCR concessions ('Final Frame QA Checklist' Frame Assembly workflow actions)
  dictionary_frameNCRSignoff_current: {
    ericJames: 'Eric James',
    niklasTempleton: 'Niklas Templeton',
  },

  dictionary_frameNCRSignoff_former: {
    olgaBeltramello: 'Olga Beltramello',
    radosavPantelic: 'Radosav Pantelic',
  },

  // Frame Prep D-band personnel ('Frame Prep - ???' APA Assembly workflow actions and 'Grounding Mesh Panel Final Inspection' actions)
  dictionary_dBandFramePrep_current: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    wayneGreen: 'Wayne Green',
    nicholasHays: 'Nicholas Hays',
    albertoMarchionni: 'Alberto Marchionni',
    grahamMitchell: 'Graham Mitchell',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
    jasonThornhill: 'Jason Thornhill',
  },

  dictionary_dBandFramePrep_former: {
    kimWilliams: 'Kim Williams',
  },

  // Personnel who are authorised to signoff on tension control verification ('? Layer - Winding' APA Assembly workflow actions)
  dictionary_tensionControlSignoff_current: {
    vincentBaker: 'Vincent Baker',
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
  },

  dictionary_tensionControlSignoff_former: {
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    daveSim: 'Dave Sim',
  },

  // Personnel who are authorised to signoff on winder maintenance verification ('? Layer - Winding' APA Assembly workflow actions)
  dictionary_winderMaintenanceSignoff_current: {
    vincentBaker: 'Vincent Baker',
    daveBrown: 'Dave Brown',
    edBlucher: 'Ed Blucher',
    markFarrell: 'Mark Farrell',
    lewisGannon: 'Lewis Gannon',
    darrenKaye: 'Darren Kaye',
    albertoMarchionni: 'Alberto Marchionni',
    benjaminOye: 'Benjamin Oye',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
  },

  dictionary_winderMaintenanceSignoff_former: {
    carlosChavezBarajas: 'Carlos Chavez Barajas',
    andrewKelly: 'Andrew Kelly',
    daveSim: 'Dave Sim',
  },

  // Winding D-band personnel (winding-related APA Assembly workflow actions)
  dictionary_dBandWinding_current: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    markFarrell: 'Mark Farrell',
    lewisGannon: 'Lewis Gannon',
    darrenKaye: 'Darren Kaye',
    albertoMarchionni: 'Alberto Marchionni',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
  },

  dictionary_dBandWinding_former: {
    andrewKelly: 'Andrew Kelly',
  },

  // Post-Production D-band personnel (post-winding APA Assembly workflow actions except for 'Conduit Insertion', and all APA Post Production workflow actions)
  dictionary_dBandPostProduction_current: {
    edBlucher: 'Ed Blucher',
    albertoMarchionni: 'Alberto Marchionni',
    danielSalisbury: 'Daniel Salisbury',
    jasonThornhill: 'Jason Thornhill',
  },

  dictionary_dBandPostProduction_former: {
    radosavPantelic: 'Radosav Pantelic',
  },

  // Personnel who are authorised to signoff on Conduit Insertion checks ('Conduit Insertion' APA Assembly workflow actions)
  dictionary_dBandConduitInsertion_current: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    albertoMarchionni: 'Alberto Marchionni',
    danielSalisbury: 'Daniel Salisbury',
    jasonThornhill: 'Jason Thornhill',
  },

  dictionary_dBandConduitInsertion_former: {
    radosavPantelic: 'Radosav Pantelic',
  },

  // FD-HD technical coordinators (final signoff in 'Completed APA QA Checklist' APA Assembly workflow actions)
  dictionary_fdhdTechCoordSignoff_current: {
    ericJames: 'Eric James',
  },

  dictionary_fdhdTechCoordSignoff_former: {
    // [empty dictionary]
  },

  // Personnel who are authorised to signoff on post-reception Assembled APA Shipment QA checks ('Assembled APA Shipment Post-Reception QA' APA Post Production workflow actions)
  dictionary_apaShipmentPostReceptionSignoff_current: {
    alexandreAcerraGil: 'Alexandre Acerra Gil',
    wayneGreen: 'Wayne Green',
    brianRebel: 'Brian Rebel',
  },

  dictionary_apaShipmentPostReceptionSignoff_former: {
    // [empty dictionary]
  },

  // Lead personnel at the UK and US APA factories (top-level signoffs in various APA Assembly and APA Post Production workflow actions)
  dictionary_apaFactoryLeads_current: {
    edBlucher: 'Ed Blucher',
    daveBrown: 'Dave Brown',
    carlosManuelGuerraGranjeiro: 'Carlos Manuel Guerra Granjeiro',
    albertoMarchionni: 'Alberto Marchionni',
    gwennMouster: 'Gwenn Mouster',
    danielSalisbury: 'Daniel Salisbury',
    stephenSumner: 'Stephen Sumner',
    niklasTempleton: 'Niklas Templeton',
    annaVikhoreva: 'Anna Vikhoreva',
  },

  dictionary_apaFactoryLeads_former: {
    radosavPantelic: 'Radosav Pantelic',
    sotirisVlachos: 'Sotiris Vlachos',
  },

  // Personnel who are authorised to signoff on yokes ('Yoke' components)
  dictionary_yokeSignoff_current: {
    joeMunski: 'Joe Munski',
  },

  dictionary_yokeSignoff_former: {
    // [empty dictionary]
  },

  // Personnel who are authorised to signoff on populated board shipments ('CE Adapter Board' and 'Multi-Type Populated Board' shipment components)
  dictionary_populatedBoardShipmentSignoff_current: {
    pamMarrLaundrie: 'Pam Marr-Laundrie',
  },

  dictionary_populatedBoardShipmentSignoff_former: {
    // [empty dictionary]
  },

  // Personnel who are authorised to signoff on APA cold tests ('APA Cold Test' Assembled APA actions)
  dictionary_apaColdTestSignoff_current: {
    pipHamilton: 'Pip Hamilton',
    brianRebel: 'Brian Rebel',
    jozefTrokanTenorio: 'Jozef Trokan-Tenorio',
    sotirisVlachos: 'Sotiris Vlachos',
  },

  dictionary_apaColdTestSignoff_former: {
    // [empty dictionary]
  },
}
