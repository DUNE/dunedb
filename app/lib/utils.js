module.exports = {
  // A 36 character long full UUID, of the form: [8]-[4]-[4]-[4]-[12]
  uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',

  // A 20 to 22 character long shortened UUID
  short_uuid_regex: ':shortuuid([0-9a-bA-Z-]{20,22})',

  // A dictionary of locations that are used across all component and action type forms
  // Using this centralised dictionary allows locations to be consistently displayed, regardless of on which page of the interface
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
    uw: 'Wisconsin',
    uwPsl: 'UW / PSL',
    williamAndMary: 'William and Mary',
    wisconsin: 'Wisconsin',
  },
}
