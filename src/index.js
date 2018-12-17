
// mhtml parser
module.exports.Parser = require('./parser');
// mhtml reader
module.exports.Processor = require('./processor');

if (require.main === module) {
  // server mode
  module.exports.Processor.serve(process.env.PORT || 8080);
}
