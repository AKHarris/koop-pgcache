var Geoservices = require('./geoservices')
var spawn = require('child_process').spawn
var _ = require('highland')

/**
 * Creates a stream that exports geojson from the database as a string
 *
 * @param {string} conn - psql connection string
 * @param {string} table - the table to exports
 * @param {object} options - includes which rows to export
 */
module.exports = {
  create: function (conn, table, options) {
    var dbStream = createDbStream(conn, table, options)
    var jsonMode = options.json || 'string'
    // rows coming from the DB are newline terminated, so we need to split and filter to get individual rows
    var outStream = _(dbStream.stdout).split().compact()

    dbStream.stderr.on('data', function (err) {
      outStream.emit('error', err)
    })
    return jsonMode ? outStream.map(JSON.parse) : outStream
  }
}

/**
 * Creates the source db stream
 *
 * @param {string} conn - psql connection string
 * @param {object} options - which rows to select
 * @param {function} callback - calls back with an error or a stream from the db
 * @private
 */
function createDbStream (conn, table, options) {
  var where = Geoservices.parse(options)
  var sql = 'copy (select feature from "' + table + '" ' + where + ') to stdout;'
  var params = ['-c', sql, '-d', conn]
  return spawn('psql', params)
}