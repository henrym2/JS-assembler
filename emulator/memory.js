app.service('memory', [function () {
  let memory = {
    data: Array(256),
    lastAccess: -1,
    load: function (address) {
      let self = this;
      if(address < 0 || address >= self.data.length){
        throw "Memory access violation at " + address;
      }
      self.lastAccess = address;
      return self.data[address];
    },

    store: function(address, value) {
      let self = this;
      if(address < 0 || address >= self.data.length){
        throw "Memory access violation at " + address;
      }

      self.lastAccess = address;
      self.data[address] = value;
    },

    reset: function() {
      let self = this;

      self.lastAccess = -1;
      for(let i = 0; i < self.data.length; i++){
        self.data[i] = 0;
      }
    }
  };

  memory.reset();
  return memory;
}]);
