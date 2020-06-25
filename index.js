const request = require('request');
const uri = 'http://ordbok.uib.no/perl/ordbok.cgi';
const parser = require('./lib/parser');
let reqOpts = {
  begge: '+&ordbok=begge&ava=ava&type=alle_former',
};

module.exports = function (opts, callback) {
  if (!opts.word) {
    return callback(new Error('Missing required param: word'), null);
  }

  reqOpts.OPP = opts.word;

  request(uri, { qs: reqOpts }, function (error, response, body) {
    if (error) {
      return callback(error, null);
    }

    parser(body.toString(), function (err, data) {
      if (err) {
        return callback(err, null);
      }
      return callback(null, data);
    });
  });
};
