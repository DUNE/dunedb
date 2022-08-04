module.exports = {
  // A 36 character long full UUID, of the form: [8]-[4]-[4]-[4]-[12]
  uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',

  // A 22 character long shortened UUID, of the form [22]
  short_uuid_regex: ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ-]{22})',
}
