import React, { useEffect } from "react";

function positiveTimeSplit(diff){
	var nosSeconds = diff - 60 * Math.floor(diff/60);
	var min = (diff - nosSeconds)/60;
	var nosMinutes = min - 60 * Math.floor(min/60);
	var hours = (min - nosMinutes)/60;
	var nosHours = hours - 24 * Math.floor(hours/24);
	var days = (hours - nosHours)/24;
	return {days, hours:nosHours, minutes:nosMinutes, seconds:nosSeconds};	
}

function calcTimeSplit(timeDiff){
	if (timeDiff >= 0){
		return positiveTimeSplit(timeDiff);
	}else{
		var k = positiveTimeSplit(-timeDiff);
		if (k.days){
			k.days = -k.days;
		}else if (k.hours){
			k.hours = -k.hours;
		}else if (k.minutes){
			k.minutes = -k.minutes;
		}else if (k.seconds){
			k.seconds = -k.seconds;
		}
		return k;
	}
}


function App(props) {

	var style = props.style;
	const [tickTock, setTickTock] = React.useState(0);


	function toggleTime(t){
		setTickTock(t);
		setTimeout(function(){ toggleTime(1 - t); }, 1000);
	}

	React.useEffect(() => {
		toggleTime(0);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	var nosTime = new Date();
	
	var timeDiff = Math.floor(nosTime.getTime()/1000) - style.time.toNumber();
	if (style.reverse){
		timeDiff = - timeDiff;
	}
	
	if (style.stopAt0 && timeDiff < 0){
		timeDiff = 0;
	}

	var splitTime = calcTimeSplit(timeDiff);

	var mainstyle = {};
	mainstyle.backgroundColor = style.backgroundColor;
	mainstyle.color = style.color;
	mainstyle.borderColor = style.borderColor;
	mainstyle.borderStyle = style.borderStyle;
	mainstyle.borderRadius = style.borderRadius;
	mainstyle.borderWidth = style.borderWidth;
	var numberstyle = {};
	var unitstyle = {};

	var pieces = ['days','hours','minutes', 'seconds'];
	var set = pieces.map((aP, index)=>{
		var days = splitTime[aP];
		if (!days){
			return null;
		}else{
			return <div className="countdown-item" key={index} style={mainstyle}>
							<div style={numberstyle}>{days}</div>
							<span style={unitstyle}>{aP}</span>
						</div>
		}
	})		
//
	return <div className="countdown-wrapper">{set}</div>
}


export default App;
