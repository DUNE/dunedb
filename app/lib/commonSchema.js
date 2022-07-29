
/// Insertion data for a single record
function insertion(req) {
  // Check that the minimum required information has been provided for a record's insertion data
  // This is simply user profile information (stored in 'req.user')
  if (!req) throw new Error(`commonSchema::insertion() - the 'req' object has not been specified!`);
  if (!req.user) throw new Error(`commonSchema::insertion() - the 'req.user' has not been specified!`);

  // Retrieve the specific user information fields
  const { user_id, displayName, emails } = req.user;

  // Return the required information using the appropriate 'insertion.XXX' field names
  return {
    insertDate: new Date(),
    ip: req.ip,
    user: { user_id, displayName, emails },
  };
}


/// Validity data for a single record
function validity(old_record) {
  // Set up a variable to hold the new validity object
  let v = {};

  // Retrieve the validity object of an old record, if one has been provided
  // If there is no old record (i.e. 'old_record' = null), this is just empty
  const v_old = (old_record || {}).validity || {};

  // Set the new validity start date to be the current date
  v.startDate = new Date();

  // Set the new validity version number to be either:
  //   - 'old version number + 1' if an old record's validity has been provided
  //   - '1' if no old record validity is available
  v.version = (parseInt(v_old.version) || 0) + 1;

  // Return the (partially complete) new validity object
  // The third 'validity' field ('ancestor_id') is set explicitly in the record's 'save()' function
  return v;
}


module.exports = {
  insertion,
  validity,
}
