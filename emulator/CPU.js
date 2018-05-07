app.service('cpu' ['opcodes', 'memory', function(opcodes, memory) {
    let cpu = {
        step: function () {
            let self = this;

            if (self.fault === true) {
                throw "FAULT. Reset CPU to continue";
            }
            try {
                let checkGPR = function (reg) {
                    if (reg < 0 || reg >= self.gpr.length) {
                        throw "Invalid Register " + reg;
                    } else {
                        return reg;
                    }
                };
                let checkSP = function (reg) {
                    if (reg < 0 || reg >= 1 + self.gpr.length) {
                        throw "Invalid register " + reg;
                    } else {
                        return reg;
                    }
                };
                let setSP = function (reg, value) {
                    if (reg >= 0 && reg < self.gpr.length) {
                        self.gpr[reg] = value;
                    } else if (reg === self.gpr.length) {
                        self.SP = value;
                    } else {
                        throw "Invalid Register " + reg;
                    }
                };

                let getSP = function (reg) {
                    if (reg >= 0 && reg < self.gpr.length) {
                        return self.gpr[reg];
                    } else if (reg === self.gpr.length) {
                        return self.sp;
                    } else {
                        throw "Invalid Register " + reg;
                    }
                };
                let indirectRegisterAccess = function (value) {
                    let reg = value % 8;

                    let base;
                    if (reg < self.gpr.length) {
                        base = self.gpr[reg];
                    } else {
                        base = self.sp;
                    }

                    let offset = Math.floor(value / 8);
                    if (offset > 15) {
                        offset = offset - 32;
                    }

                    return base + offset;
                };

                let checkOperation = function (value) {
                    self.zero = false;
                    self.carry = false;

                    if (value >= 256) {
                        self.carry = true;
                        value = value % 256;
                    } else if (value === 0) {
                        self.zero = true;
                    } else if (value < 0) {
                        self.negative = true;
                        self.overflow = true;
                        value = 256 - (-value) % 256;
                    }

                    return value;
                };

                let jump = function (newIP) {
                    if (newIP < 0 || newIP >= memory.data.length) {
                        throw "Program counter oustide of memory";
                    } else {
                        self.pc = newIP;
                    }
                };

                let store = function (value) {
                    memory.store(self.sp--, value);
                    if (self.sp < self.minSP) {
                        throw "Stack Overflow!";
                    }
                };
                let load = function (value) {
                    memory.load(++self.sp, value);
                    if (self.sp > self.maxSP) {
                        throw "Stack Overflow!";
                    }
                };
                let getReg = function() {
                    return checkGPR(memory.load(++self.pc));
                };
                //Currently unused opcodes DIV ect
              /*  let division = function (divisor) {
                    if (divisor === 0) {
                        throw "Division by zero";
                    }

                    return Math.floor(self.gpr[0] / divisor);
                };
                */
                if (self.pc < 0 || self.pc >= memory.data.length) {
                    throw "Program counter outside of memory";
                }

                let regTo, regFrom, memFrom, memTo, number;
                let instr = memory.load(pc);
                switch (instr) {
                    case opcodes.NONE:
                        return false;  //Abort
                    case opcodes.MOV_REG_TO_REG:
                        regTo = checkSP(memory.load(++self.pc));
                        regFrom = checkSP(memory.load(++self.pc));
                        setSP(regTo, getSP(regFrom));
                        self.pc++;
                        break;
                    case opcodes.MOV_ADDRESS_TO_REG:
                        regTo = checkSP(memory.load(++self.pc));
                        memFrom = memory.load(++self.pc);
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
                        memory.store(indirectRegisterAccess(regTo), getSP(regFrom));
                        self.pc++;
                        break;
                    case opcodes.MOV_NUMBER_TO_REG:
                        regTo = checkSP(memory.load(++self.pc));
                        number = memory.load(++self.pc);
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
                        checkOperation(getSP(regTo) - number);
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
                        if (self.carry === true) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BCS_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        if (self.carry === true) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BCC_ADDRESS:
                        regTo = checkSP(memory.load(++self.pc));
                        if (self.carry === false) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BCC_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        if (self.carry === false) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BZS_ADDRESS:
                        regTo = checkSP(memory.load(++self.pc));
                        if (self.zero === true) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BZS_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        if (self.zero === true) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BZC_ADDRESS:
                        regTo = checkSP(memory.load(++self.pc));
                        if (self.zero === false) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BZC_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        if (self.zero === false) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BNS_ADDRESS:
                        regTo = checkSP(memory.load(++self.pc));
                        if (self.negative === true) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.pc++;
                        }
                        break;
                    case opcodes.BNS_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        if (self.negative === true) {
                            jump(self.gpr[regTo]);
                        }
                        else {
                            self.pc++;
                        }
                        break;
                    case opcodes.STORE_REG:
                        regFrom = checkGPR(memory.load(++self.pc));
                        store(self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.STORE_REGADDRESS:
                        regFrom = memory.load(++self.pc);
                        store(memory.load(indirectRegisterAccess(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.STORE_ADDRESS:
                        regFrom = memory.load(++self.pc);
                        store(memory.load(regFrom));
                        self.pc++;
                        break;
                    case opcodes.STORE_NUMBER:
                        number = memory.load(++self.pc);
                        store(number);
                        self.pc++;
                        break;
                    case opcodes.LOAD_REG:
                        regFrom = checkSP(memory.load(++self.pc));
                        load(self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.CALL_ADDRESS:
                        number = memory.load(++self.pc);
                        store(self.pc++);
                        jump(number);
                        break;
                    case opcodes.CALL_REGADDRESS:
                        regTo = memory.load(++self.pc);
                        store(self.pc++);
                        jump(self.gpr[regTo]);
                        break;
                    case opcodes.RET:
                        jump(pop());
                        break;
                    case opcodes.MUL_REG_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        setSP(regTo, checkOperation(getSP(regTo) * getSP(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.MUL_ADDRESS_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.sp);
                        setSP(regTo, checkOperation(getSP(regTo) * regFrom));
                        self.pc++;
                        break;
                    case opcodes.MUL_REGADDRESS_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.sp);
                        setSP(regTo, checkOperation(getSP(regTo) * memory.load(indirectRegisterAccess(regFrom))));
                        self.pc++;
                        break;
                    case opcodes.MUL_NUMBER_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        setSP(regTo, checkOperation(getSP(regTo) * number));
                        self.pc++;
                        break;
                    case opcodes.AND_REG_WITH_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.AND_REGADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & memory.load(indirectRegisterAccess((regFrom))));
                        self.pc++;
                        break;
                    case opcodes.AND_ADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & memory.load(regFrom));
                        self.pc++;
                        break;
                    case opcodes.AND_NUMBER_WITH_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & number);
                        self.pc++;
                        break;
                    case opcodes.OR_REG_WITH_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        self.gpr[regTo] = checkOperation((self.gpr[regTo] | self.gpr[regFrom]));
                        self.pc++;
                        break;
                    case opcodes.OR_ADDRESS_WITH_REG:
                        regTo = getReg();
                        memFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | memory.load(memFrom));
                        self.pc++;
                        break;
                    case opcodes.OR_REGADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | memory.load(indirectRegisterAccess(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.OR_NUMBER_WITH_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | number);
                        self.pc++;
                        break;
                    case opcodes.XOR_REG_WITH_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.XOR_ADDRESS_WITH_REG:
                        regTo = getReg();
                        memFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ memory.load(regFrom));
                        self.pc++;
                        break;
                    case opcodes.XOR_REGADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ memory.load(indirectRegisterAccess(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.XOR_NUMBER_WITH_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ number);
                        self.pc++;
                        break;
                    case opcodes.NOT_REG:
                        regTo = getReg();
                        self.gpr[regTo] = checkOperation(~self.gpr[regTo]);
                        self.pc++;
                        break;
                    case opcodes.LSL_REG_WITH_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.LSL_ADDRESS_WITH_REG:
                        regTo = getReg();
                        memFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << memory.load(memFrom));
                        self.pc++;
                        break;
                    case opcodes.LSL_REGADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << memory.load(indirectRegisterAccess(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.LSL_NUMBER_WITH_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << number);
                        self.pc++;
                        break;
                    case opcodes.LSR_REG_WITH_REG:
                        regTo = getReg();
                        regFrom = getReg();
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >> self.gpr[regFrom]);
                        self.pc++;
                        break;
                    case opcodes.LSR_ADDRESS_WITH_REG:
                        regTo = getReg();
                        memFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >> memory.load(memFrom));
                        self.pc++;
                        break;
                    case opcodes.LSR_REGADDRESS_WITH_REG:
                        regTo = getReg();
                        regFrom = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >> memory.load(indirectRegisterAccess(regFrom)));
                        self.pc++;
                        break;
                    case opcodes.LSR_NUMBER_WITH_REG:
                        regTo = getReg();
                        number = memory.load(++self.pc);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >> number);
                        self.pc++;
                        break;
                    default:
                        throw "Invalid OP code " + instr;
                }
                return true;
            }
            catch (e) {
                self.fault = true;
                throw e;
            }
        },


        reset: function () {
            let self = this;
            self.gpr = [0, 0, 0, 0, 0, 0, 0, 0];
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
