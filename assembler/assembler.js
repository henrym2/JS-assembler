app.service('assembler', ['opcodes', function(opcodes){
  return {
      assemble: function (input) {
          //insane regex thing for separating a single instruction into 7 distinct groups
          //Graphical representation on httpsL//debuggex.com/
          let regex = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+(([+\-])\d+)?)]|".+?"|'.+?'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+(([+\-])\d+)?)]|".+?"|'.+?'|[.A-Za-z0-9]\w*))?)?)?/;


          let op1_group = 3;
          let op2_group = 7;
          let regexNum = /^[-+]?[0-9]+$/;
          let regexLabel = /^[A-Za-z]\w*$/;

          let code = [];
          let mapping = {};
          let labels = {};
          let normalizedLabels = {};

          let lines = input.split('\n');

          let parseNumber = function (input) {
              if (input.slice(0, 2) === "0x") {
                  return parseInt(input.slice(2), 16);
              } else if (input.slice(0, 2) === "0o") {
                  return parseInt(input.slice(2), 8);
              } else if (input.slice(input.length - 1) === "b") {
                  return parseInt(input.slice(0, input.length - 1), 2);
              } else if (input.slice(input.length - 1) === "d") {
                  return parseInt(input.slice(0, input.length - 1), 10);
              } else if (regexNum.exec(input)) {
                  return parseInt(input, 10);
              } else {
                  throw "Invalid number Format";
              }
          };


          //Allowed registers: R1, R2, R3, R4, R5, R6, R7, R8, SP
          let parseRegister = function (input) {
              if (input === "R1") {
                  return 0;
              } else if (input === "R2") {
                  return 1;
              } else if (input === "R3") {
                  return 2;
              } else if (input === "R4") {
                  return 3;
              } else if (input === "R5") {
                  return 4;
              } else if (input === "R6") {
                  return 5;
              } else if (input === "R7") {
                  return 6;
              } else if (input === "R8") {
                  return 7;
              } else {
                  return undefined;
              }
          };

          let parseOffsetAddressing = function (input) {
              input = input.toUpperCase();
              let m = 0;
              let base = 0;

              if (input.slice(0, 2) === "R1") {
                  base = 0;
              } else if (input.slice(0, 2) === "R2") {
                  base = 1;
              } else if (input.slice(0, 2) === "R3") {
                  base = 2;
              } else if (input.slice(0, 2) === "R4") {
                  base = 3;
              } else if (input.slice(0, 2) === "R5") {
                  base = 4;
              } else if (input.slice(0, 2) === "R6") {
                  base = 5;
              } else if (input.slice(0, 2) === "R7") {
                  base = 6
              } else if (input.slice(0, 2) === "R8") {
                  base = 7;
              } else if (input.slice(0, 2) === "SP") {
                  base = 8;
              } else {
                  return undefined;
              }
              let offset_start = 1;
              if (base === 8) {
                  offset_start = 2;
              }

              if (input[offset_start] === '-') {
                  m = -1;
              } else if (input[offset_start] === '+') {
                  m = 1;
              } else {
                  return undefined;
              }

              let offset = m * parseInt(input.slice(offset_start + 1), 10);

              if (offset < -16 || offset > 15) {
                  throw "offset must be a value between -16 and +15";
              }
              if (offset < 0) {
                  offset = 32 + offset;
              }
              return offset * 8 + base;
          };

          //Allowed : Register, label or number ; SP+/-Number is allowed
          let parseRegOrNumber = function (input, typeReg, typeNumber) {
              let register = parseRegister(input);

              if (register !== undefined) {
                  return {type: typeReg, value: register};
              } else {
                  let label = parseLabel(input);
                  if (label !== undefined) {
                      return {type: typeNumber, value: label};
                  } else {
                      if (typeReg === "regAddress") {
                          register = parseOffsetAddressing(input);

                          if (register !== undefined) {
                              return {type: typeReg, value: register};
                          }
                      }
                      let value = parseNumber(input);

                      if (isNaN(value)) {
                          throw "Not a " + typeNumber + ": " + value;
                      } else if (value < 0 || value > 255) {
                          throw typeNumber + " must have a value between 0-255";
                      }
                  }
                  return {type: typeNumber, value: value};

              }

          };
          let parseLabel = function (input) {
              return regexLabel.exec(input) ? input : undefined;
          };
          let getValue = function (input) {
              switch (input.slice(0, 1)) {
                  case '[':
                      let address = input.slice(1, input.length - 1);
                      return parseRegOrNumber(address, "regAddress", "address");
                  case '"':
                      let text = input.slice(1, input.length - 1);
                      let chars = [];

                      for (let i = 0; i < text.length; i++) {
                          chars.push(text.charCodeAt(i));
                      }

                      return {type: "numbers", value: chars};
                  case "'":
                      let character = input.slice(1, input.length - 1);
                      if (character.length > 1) {
                          throw "Only one character is allowed. Use string instead";
                      }
                      return {type: "number", value: character.charCodeAt(0)};
                  default:
                      return parseRegOrNumber(input, "register", "Address");
              }
          };
          let addLabel = function (label) {
              let upperLabel = label.toUpperCase();
              if (upperLabel in normalizedLabels) {
                  throw "Duplicate Label: " + label;
              }
              if (upperLabel === "R1" || upperLabel === "R2" || upperLabel === "R3" || upperLabel === "R4"
                  || upperLabel === "R5" || upperLabel === "R6" || upperLabel === "R7" || upperLabel === "SP") {
                  throw "Label contains keyword: " + upperLabel;
              }
              labels[label] = code.length;
          };

          let checkNoExtraArg = function (instr, arg) {
              if (arg !== undefined) {
                  throw instr + ":too many arguments";
              }
          };

          for (let i = 0; i < lines.length; i++) {
              try {
                  let match = regex.exec(lines[i]);
                  if (match[1] !== undefined || match[2] !== undefined) {
                      if (match[1] !== undefined) {
                          addLabel(match[1]);
                      }
                      if (match[2] !== undefined) {
                          let instr = match[2].toUpperCase();
                          let p1, p2, opCode;

                          if (instr !== 'DB') {
                              mapping[code.length] = i;
                          }
                          switch (instr) {
                              case 'DB':
                                  p1 = getValue(match[op1_group]);

                                  if (p1.type === "number") {
                                      code.push(p1.value);
                                  } else if (p1.type === "numbers") {
                                      for (let j = 0; j < p1.value.length; j++) {
                                          code.push(p1.value[j]);
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "DB does not support this operand";
                                  }
                                  break;
                              case 'HLT':
                                  checkNoExtraArg('HLT', match[op1_group]);
                                  opCode = opcodes.NONE;
                                  code.push(opCode);
                                  break;
                              case 'MOV':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);

                                  if (p1.type === "register" && p2.type === "register") {
                                      opCode = opcodes.MOV_REG_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.MOV_ADDRESS_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "regaddress") {
                                      opCode = opcodes.MOV_REGADDRESS_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "number") {
                                      opCode = opcodes.MOV_NUMBER_TO_REG;
                                  } else if (p1.type === "address" && p2.type === "register") {
                                      opCode = opcodes.MOV_REG_TO_ADDRESS;
                                  } else if (p1.type === "regaddress" && p2.type === "register") {
                                      opCode = opcodes.MOV_REG_TO_REGADDRESS;
                                  } else if (p1.type === "address" && p2.type === "number") {
                                      opCode = opcodes.MOV_NUMBER_TO_ADDRESS;
                                  } else if (p1.type === "regaddress" && p2.type === "number") {
                                      opCode = opcodes.MOV_NUMBER_TO_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "MOV does not support that operation";
                                  }
                                  code.push(opCode, p1.value, p2.value);
                                  break;
                              case 'ADD':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);

                                  if (p1.type === "register" && p2.type === "register") {
                                      opCode = opcodes.ADD_REG_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.ADD_ADDRESS_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "regaddress") {
                                      opCode = opcodes.ADD_REGADDRESS_TO_REG;
                                  } else if (p1.type === "register" && p2.type === "number") {
                                      opCode = opcodes.ADD_NUMBER_TO_REG;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "ADD does not support that operation";
                                  }
                                  code.push(opCode, p1.value, p2.value);
                                  break;
                              case 'SUB':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);

                                  if (p1.type === "register" && p2.type === "register") {
                                      opCode = opcodes.SUB_REG_FROM_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.SUB_ADDRESS_FROM_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.SUB_REGADDRESS_FROM_REG;
                                  } else if (p1.type === "register" && p2.type === "number") {
                                      opCode = opcodes.SUB_NUMBER_FROM_REG;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "SUB does not support that operation";
                                  }
                                  code.push(opCode, p1.value, p2.value);
                                  break;
                              case 'CMP':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);

                                  if (p1.type === "register" && p2.type === "register") {
                                      opCode = opcodes.CMP_REG_WITH_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.CMP_ADDRESS_WITH_REG;
                                  } else if (p1.type === "register" && p2.type === "address") {
                                      opCode = opcodes.CMP_REGADDRESS_WITH_REG;
                                  } else if (p1.type === "register" && p2.type === "number") {
                                      opCode = opcodes.CMP_NUMBER_WITH_REG;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "CMP does not support that operation";
                                  }
                                  code.push(opCode, p1.value, p2.value);
                                  break;
                              case 'B':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BRANCH_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BRANCH_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BRANCH does not support that operation";
                                  }
                                  code.push(opCode, p1.value);
                                  break;
                              case 'BCS':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BCS_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BCS_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BCS does not support that operation";
                                  }
                                  break;
                              case 'BCC':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BCC_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BCC_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BCC does not support that operation";
                                  }
                                  break;
                              case 'BZS':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BZS_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BZS_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BZS does not support that operation";
                                  }
                                  break;
                              case 'BZC':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BZC_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BZC_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BZC does not support that operation";
                                  }
                                  break;
                              case 'BNS':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.BNS_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.BNS_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "BNS does not support that operation";
                                  }
                                  break;
                              case 'STR':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "register") {
                                      opCode = opcodes.STORE_REG;
                                  } else if (p1.type === "address") {
                                      opCode = opcodes.STORE_ADDRESS;
                                  } else if (p1.type === "regaddrrsss") {
                                      opCode = opcodes.STORE_REGADDRESS;
                                  } else if (p1.type === "number") {
                                      opCode = opcodes.STORE_NUMBER;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "STR does not support that operation";
                                  }
                                  break;
                              case 'LDR':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "register") {
                                      opCode = opcodes.LOAD_REG;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "LDR does not support that operation";
                                  }
                                  break;
                              case 'BL':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "address") {
                                      opCode = opcodes.CALL_ADDRESS;
                                  } else if (p1.type === "regaddress") {
                                      opCode = opcodes.CALL_REGADDRESS;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "CALL does not support that operation";
                                  }
                                  break;
                              case 'BX':
                                  opCode = opcodes.RET;
                                  break;
                              case 'MUL':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.MUL_REG_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.MUL_ADDRESS_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.MUL_REGADDRESS_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.MUL_NUMBER_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "MUL does not support that operation";
                                  }
                                  break;
                              case 'AND':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.AND_REG_WITH_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.AND_ADDRESS_WITH_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.AND_REGADDRESS_WITH_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.AND_NUMBER_WITH_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "AND does not support that operation";
                                  }
                                  break;
                              case 'OR':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.OR_REG_WITH_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.OR_ADDRESS_WITH_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.OR_REGADDRESS_WITH_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.OR_NUMBER_WITH_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "OR does not support that operation";
                                  }
                                  break;
                              case 'XOR':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.XOR_REG_WITH_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.XOR_ADDRESS_WITH_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.XOR_REGADDRESS_WITH_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.XOR_NUMBER_WITH_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "XOR does not support that operation";
                                  }
                                  break;
                              case 'NOT':
                                  p1 = getValue(match[op1_group]);
                                  if (p1.type === "register") {
                                      opCode = opcodes.NOT_REG;
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "NOT does not support that operation";
                                  }
                                  break;
                              case 'LSL':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.LSL_REG_WITH_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.LSL_ADDRESS_WITH_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.LSL_REGADDRESS_WITH_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.LSL_NUMBER_WITH_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "LSL does not support that operation";
                                  }
                                  break;
                              case 'LSR':
                                  p1 = getValue(match[op1_group]);
                                  p2 = getValue(match[op2_group]);
                                  if (p1.type === "register") {
                                      if (p2.type === "register") {
                                          opCode = opcodes.LSL_REG_WITH_REG;
                                      } else if (p2.type === "address") {
                                          opCode = opcodes.LSL_ADDRESS_WITH_REG;
                                      } else if (p2.type === "regaddress") {
                                          opCode = opcodes.LSL_REGADDRESS_WITH_REG;
                                      } else if (p2.type === "number") {
                                          opCode = opcodes.LSL_NUMBER_WITH_REG;
                                      }
                                  } else {
                                      // noinspection ExceptionCaughtLocallyJS
                                      throw "LSL does not support that operation";
                                  }
                                  p2 = getValue(match[op2_group]);
                                  code.push(opCode, p1.value, p2.value);
                                  break;
                              default:
                                  // noinspection ExceptionCaughtLocallyJS
                                  throw "Invalid Instruction " + match[2];
                          }
                      }
                  } else {
                      let line = lines[i].trim();
                      if (line === "" && line.slice(0, 1) === ";") {
                          // noinspection ExceptionCaughtLocallyJS
                          throw "syntax error";
                      }
                  }
              } catch (e) {
                  throw {error: e, line: i};
              }
          }
          //Replace input labels
          for (let i = 0; i < code.length; i++) {
              if (!angular.isNumber(code[i])) {
                  if (code[i] in labels) {
                      code[i] = labels[code[i]];
                  } else {
                      throw {error: "Undefined label " + code[i]};

                  }
              }
          }
          return {code: code, mapping: mapping, labels: labels};
      }
  };
}]);
