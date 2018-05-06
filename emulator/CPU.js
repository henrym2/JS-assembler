app.service('cpu' ['opcodes', 'memory', function(opcodes, memory) {
  var cpu = {
  step: function() {
      var self = this;

      if(self.fault === true){
        throw "FAULT. Reset CPU to continue";
      }
      try {
        var checkGPR = function(reg){
          if(reg < 0 || reg >= self.gpr.length) {
            throw "Invalid Register " + reg;
          } else {
            return reg;
          }
        };
        var checkSP = function(reg){
          if(reg < 0 || reg >= 1 + self.gpr.length){
            throw "Invalid register " + reg;
          } else {
            return reg;
          }
        };
        var setSP = function(reg, value){
          if(reg >=0 && reg < self.gpr.length){
            self.gpr[reg] = value;
          }else if(reg == self.gpr.length){
            self.SP = value;
          }else{
            throw "Invalid Register " + reg;
          }
        };
        var indirectRegisterAccess = function(value){
          var reg = value % 8;

          var base;
          if(reg < self.gpr.length){
            base = self.gpr[reg];
          } else {
            base = self.sp;
          }

          var offset = Math.floor(value / 8);
          if(offset > 15) {
            offset = offset-32;
          }

          return base+offset;
        };

        var checkOperation = function(value) {
          self.zero = false;
          self.carry = false;

          if(value >= 256) {
            self.carry = true;
            value = value % 256;
          } else if(value === 0) {
            self.zero = true;
          } else if (value < 0){
            self.negative = true;
            self.overflow = true;
            value = 256 - (-value) % 256;
          }

          return value;
        };

        var jump = function(newIP) {
          if( newIP < 0 || newIP >= memory.data.length) {
            throw "Program counter oustide of memory";
          }else{
            self.pc = newIP;
          }
        };

        var store = function(value){
          memory.store(self.sp--, value){
            if(self.sp < self.minSP){
              throw "Stack Overflow!";
            }
          }
        };
        var load = function(value){
          memory.load(++self.sp, value){
            if(self.sp > self.maxSP){
              throw "Stack Overflow!";
            }
          }
        };
        var division = function(divisor){
          if(divisor === 0){
            throw "Division by zero";
          }

          return Math.floor(self.gpr[0] / divisor);
        };

        if (self.pc < 0 || self.pc >= memory.data.length) {
          throw "Program counter outside of memory";
        }

        var regTo, regFrom, memFrom, memTo, number;
        var instr = memory.load(pc);
        switch(instr) {
          case opcodes.NONE:
            return false;  //Abort
            case opcodes.MOV_REG_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = checkSP(memory.load(++self.pc));
            setSP(regTo , getSP(regFrom));
            self.pc++;
            break;
          case opcodes.MOV_ADDRESS_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            memFrom = memory.load(++self.pc));
            setSP(regTo, memory.load(memFrom));
            self.pc++;
            break;
          case opcodes.MOV_REGADDRESS_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = memory.load(++self.pc);
            setSP(regTo, memory.load(indirectRegisterAccess(regFrom)));
            self.pc++;
            break;
          case opcodes.MOV_REG_TO_ADDRESS:
            memTo = memory.load(++self.pc);
            regFrom = checkSP(memory.load(++self.pc));
            memory.store(memTo, getSP(regFrom));
            self.pc++;
            break;
          case opcodes.MOV_REG_TO_REGADDRESS:
            regTo = memory.load(++self.pc);
            regFrom = checkSP(memory.load(++self.pc));
            memory.store(indirectRegisterAccess(regTo), getSP(regFrom))
            self.pc++;
            break;
          case opcodes.MOV_NUMBER_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            number = memory.load(++self.pc));
            memory.store(regTo, number);
            self.pc++;
            break;
          case opcodes.MOV_NUMBER_TO_ADDRESS:
            memTo = memory.load(++self.pc);
            number = memory.load(++self.pc);
            memory.store(memTo, number);
            self.pc++;
            break;
          case opcodes.MOV_NUMBER_TO_REGADDRESS:
            regTo = memory.load(++self.pc);
            number = memory.load(++self.pc);
            memory.store(indirectRegisterAccess(regTo), number);
            self.pc++;
            break;
          case opcodes.ADD_REG_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = checkSP(memory.load(++self.pc));
            setSP(regTo, checkOperation(getSP(regTo) + getSP(regFrom)));
            self.pc++;
            break;
          case opcodes.ADD_REGADDRESS_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) + memory.load(indirectRegisterAccess(regFrom))));
            self.pc++;
            break;
          case opcodes.ADD_ADDRESS_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            memFrom = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) + memory.load(memFrom)));
            self.pc++;
            break;
          case opcodes.ADD_NUMBER_TO_REG:
            regTo = checkSP(memory.load(++self.pc));
            number = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) + number));
            self.pc++;
            break;
          case opcodes.SUB_REG_FROM_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = checkSP(memory.load(++self.pc));
            setSP(regTo, checkOperation(getSP(regTo) - self.gpr[regFrom]));
            self.pc++;
            break;
          case opcodes.SUB_NUMBER_FROM_REG:
            regTo = checkSP(memory.load(++self.pc));
            number = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) - number));
            self.pc++;
            break;
          case opcodes.SUB_ADDRESS_FROM_REG:
            regTo = checkSP(memory.load(++self.pc));
            memFrom = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) - memory.load(memFrom)));
            self.pc++;
            break;
          case opcodes.SUB_REGADDRESS_FROM_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = memory.load(++self.pc);
            setSP(regTo, checkOperation(getSP(regTo) - memory.load(indirectRegisterAccess(regFrom))));
            self.pc++;
            break;
          case opcodes.CMP_REG_WITH_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = checkSP(memory.load(++self.pc));
            checkOperation(getSP(regTo) - getSP(regFrom));
            self.pc++;
            break;
          case opcodes.CMP_NUMBER_WITH_REG:
            regTo = checkSP(memory.load(++self.pc));
            number = memory.load(++self.pc);
            checkOperation(getSP(regTo) - number));
            self.pc++;
            break;
          case opcodes.CMP_ADDRESS_WITH_REG:
            regTo = checkSP(memory.load(++self.pc));
            memFrom = memory.load(++self.pc);
            checkOperation(getSP(regTo) - memory.load(memFrom));
            self.pc++;
            break;
          case opcodes.CMP_REGADDRESS_WITH_REG:
            regTo = checkSP(memory.load(++self.pc));
            regFrom = memory.load(++self.pc);
            checkOperation(getSP(regTo) - memory.load(indirectRegisterAccess(regFrom)));
            self.pc++;
            break;
          case opcodes.BRANCH_ADDRESS:
            regTo = checkSP(memory.load(++self.pc));
            jump(self.gpr[regTo]);
            break;
          case opcodes.BRANCH_REGADDRESS:
            regTo = memory.load(++self.pc);
            jump(self.gpr[regTo]);
            break;
          case opcodes.BCS_ADDRESS:
            regTo = checkSP(memory.load(++self.pc));
            if(self.carry === true){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BCS_REGADDRESS:
            regTo = memory.load(++self.pc);
            if(self.carry === true){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BCC_ADDRESS:
            regTo = checkSP(memory.load(++self.pc));
            if(self.carry === false){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BCC_REGADDRESS:
            regTo = memory.load(++self.pc);
            if(self.carry === false){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BZS_ADDRESS:
            regTo = checkSP(memory.load(++self.pc));
            if(self.zero === true){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BZS_REGADDRESS:
            regTo = memory.load(++self.pc);
            if(self.zero === true){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BZC_ADDRESS:
            regTo = checkSP(memory.load(++self.pc));
            if(self.zero === false){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
          case opcodes.BZC_REGADDRESS:
            regTo = memory.load(++self.pc);
            if(self.zero === false){
              jump(self.gpr[regTo]);
            }else{
              self.pc++;
            }
            break;
        }
      }
      catch(e){
        self.fault = true;
        throw e;
      }
    },

  var gpr, pc, SP, fault, carry, zero, overFlow, negative;

  reset: function() {
    var self = this;
    gpr = {0,0,0,0,0,0,0,0};
    self.maxSP = 231;
    self.minSP = 0;

    self.sp = self.maxSP;
    self.pc = 0;
    self.fault = false;
    self.carry = false;
    self.zero = false;
    self.overFlow = false;
    self.negative = false;
  }
};
cpu.reset();
return cpu;
}]);
