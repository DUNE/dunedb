/// Insertion data for a single record
function insertion(req) {
  // Check that the currently logged in user's profile information (stored in 'req.user') has been provided
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

  // If an old record has been provided, retrieve its validity object
  // If no old record has been provided (i.e. 'old_record' = null), the corresponding validity object is just empty
  const v_old = (old_record || {}).validity || {};

  // Set the new validity information:
  //   - start date is the current date
  //   - new version number to be either 'old version number + 1' if an old validity has been provided, or '1' if not
  v.startDate = new Date();
  v.version = (parseInt(v_old.version) || 0) + 1;

  // Return the (partially complete) new validity object ... the third 'validity' field ('ancestor_id') is set explicitly in the record's 'save()' function
  return v;
}


module.exports = {
  insertion,
  validity,
}
