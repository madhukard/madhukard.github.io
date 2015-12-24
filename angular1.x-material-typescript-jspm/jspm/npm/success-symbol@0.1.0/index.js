/* */ 
(function(process) {
  module.exports = process.platform === 'win32' ? '√' : '✔';
})(require('process'));
