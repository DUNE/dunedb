function setCoords(position)
{
    // Require the position be less than 10 minutes old.
    if(Date.now() - position.timestamp < (10*60*1000)) {
        console.log('updating frame',$('iframe.googlemap-currentpos'));
        $('iframe.googlemap-currentpos').attr('src',"https://www.google.com/maps/embed/v1/place?q="+position.coords.latitude+"%2C"+position.coords.longitude+"&key=AIzaSyDeEyg3PmVpBIVCRyak53KViUWg2-qiOpM")

        var form = $('form.geotag');
        // Set if on this page.
        $("input.latitude",form).val(  position.coords.latitude);
        $("input.longitude",form).val( position.coords.longitude);
        $("input.altitude",form).val(  position.coords.altitude);
        $("input.accuracy",form).val(  position.coords.accuracy);
        $("input.timestamp",form).val(position.timestamp);
        $('input[type=submit]',form).removeAttr('disabled');
    }
}



const oldCoords = localStorage.getItem('cached-geolocation');
if(oldCoords) {
    console.log("found cached geolocation",oldCoords);
    setCoords(JSON.parse(oldCoords));
}



$(function() {
    $('form.geotag input[type=submit]').attr('disabled', 'disabled');
    if (navigator.geolocation) 
            navigator.geolocation.getCurrentPosition(pos => {
                  console.log("found current geolocation",pos);
                  const cacheValue = {timestamp:pos.timestamp, coords:$.extend({},pos.coords)};
                  localStorage.setItem('cached-geolocation', JSON.stringify(cacheValue));
                  console.log("cached",localStorage.getItem('cached-geolocation'));
                  setCoords(pos);
                });
});

// $(function(){
// 	var ready =false;
// 	$('form.geotag').submit(function(){
// 		var form=this;
// 		console.log("submit!",ready);

// 		if(ready) return true;
// 		if (navigator.geolocation) {
//     		navigator.geolocation.getCurrentPosition(function(position)
//     			{
//     				$("input.latitude",form).val(  position.coords.latitude);
//     				$("input.longitude",form).val( position.coords.longitude);
//     				$("input.altitude",form).val(  position.coords.altitude);
//     				$("input.accuracy",form).val(  position.coords.accuracy);
//     				$("input.timestamp",form).val(position.timestamp);
//     				console.log("position gotten:",position);
//     				ready = true;
// 					$(form).submit();
//     			},
//     			function(error) {
//     				console.log(error);
//     			},
//     			{maximumAge: 75000});
//     		return false;
//  		} else {
//  		 	alert("Sorry, your browser doesn't support geolocation.");
//  		 	return false;
// 		}
// 	});
// });
