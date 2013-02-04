var Command;

Command = function(Commander) {
    this.commander = Commander;
    this.commander.version(this.version || '1.0.0');
    this.usage();
    this.commander.parse(process.argv);
};

Command.prototype.usage = function() {};
Command.prototype.exec = function() { console.log('Hello CLI!'); };

module.exports = Command;
