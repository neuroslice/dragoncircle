function inputParseToJSON(myusername, data, myroom) {
	//var data = $('#datasend').val();
      
   var sendDataJSON = {text: data, from: myusername, room: myroom};
   sendDataJSON.time = getDateString();
   if(data.charAt(0)=="/" && data.charAt(1)=="r") {
	  
	  
	  var r = data.indexOf("r");
	  var d = data.indexOf("d");
	  var plus = data.indexOf("+");
	  
          console.log("index of plus: " + plus);
	  if(plus == -1){plus = data.length;}
	  console.log("index of plus: " + plus);
	  
          var numRolls = +data.slice(r+1, d).trim();
	  var sides = +data.slice(d+1, plus).trim();
	  var modifier = +data.slice(plus+1).trim();
	  
	  console.log("numRolls: " + numRolls)
	  console.log("sides: " + sides)
	  console.log("modifier: " + modifier)
	  
	  if(!sides || sides == 0 || sides == "NaN"){ sides = 6;}
	  if(!numRolls || numRolls == 0 || numRolls == "NaN") {numRolls = 1;}
      if(!modifier || modifier == "NaN") {modifier = 0;}
	  

	  sendDataJSON.type = "roll";
      sendDataJSON.text = "rolled " + numRolls + "d" + sides + "+" + modifier + " and got: " + rollDie(numRolls, sides, modifier) + ".";
   }
   else if(data.charAt(0)=="/" && data.charAt(1)=="m" && data.charAt(2)=="e"){
		
		sendDataJSON.type = "emote"
		var text = data.slice(3)
		
		sendDataJSON.text = text;
		
   }
//	sendDataJSON.text = data;
   else sendDataJSON.type = "text";
   return sendDataJSON;
}



  function rollDie(numRolls, sides, modifier)
  {
    
     var dieRoll = Math.floor(Math.random() * sides) + 1;
	 var dieTotal = rollDice(numRolls, sides) + modifier;
	 return dieTotal;
  }

function roll(sides){
     if (!sides) sides = 6;
     return Math.floor(Math.random() * sides) + 1;
  }

  function rollDice(numRolls, sides)
  {
    var total = 0;
    while(numRolls-- > 0) total += roll(sides);
    return total;
  }