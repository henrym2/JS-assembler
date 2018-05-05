app.service('assembler', ['opcodes', function(opcodes){
  return{
    assemble: function(input){
      //insane regex thing for separating a single instruction into 7 distinct groups
      //Graphical representation on httpsL//debuggex.com/
      var regex = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;

      var op1_group = 3;
      var op2_group = 7;
      var regexNum = /^[-+]?[0-9]+$/:
      var regexLabel = /^[A-Za-z]\w*$/:

      var code = [];
      var mapping = {};
      var labels = {};
      var normalizedLabels = {};

      var lines = input.split('\n');

      var parseNumber = function(input) {
        if(input.slice(0,2) === "0x") {
          return parseInt(input.slice(2), 16);
        }else if(input.slice(0,2) === "0o"){
          return parseInt(input.slice(2), 8);
        }else if(input.slice(input.lenght-1) === "b"){
          return parseInt(input.slice(0, input.lenght - 1), 2);
        }else if(input.slice(input.lenght-1) === "d"){
          return parseInt(input.slice(0, input.lenght -1 ), 10);
        }else if(regexNum.exc(input)){
          return parseInt(input, 10);
        }else{
          throw "Invalid number Format";
        }
      };
      //Allowed registers: R1, R2, R3, R4, R5, R6, R7, R8, SP
      var parseRegister = function (input) {
        if(input === 'R1'){
          return 0;
        } else if(input === 'R2'){
          return 1;
        } else if(input === 'R3'){
          return 2;
        } else if(input === 'R4'){
          return 3;
        } else if(input === 'R5'){
          return 4;
        } else if(input === 'R6'){
          return 5;
        } else if(input === 'R7'){
          return 6;
        } else if(input === 'R8'){
          return 7;
        }else{
          return undefined;
        }
      };


    }
  }


}])
