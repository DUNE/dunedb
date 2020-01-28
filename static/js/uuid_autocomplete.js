$(function(){
	$('.component-uuid-autocomplete').autoComplete({
	    resolverSettings: {
	    	minLength: 3,
	        url: '/autocomplete/uuid'
	    }
	})
	$('.component-uuid-autocomplete.go-to-component').on('autocomplete.select', function (evt, item) {
		console.log("selected",item)
		window.location.href = "/"+item.val;
	});
		// });.on('keypress'function(event){
		// if(event.key=="Enter") {}
	// });	

	$('.uuid-autocomplete-container input').autoComplete({
	    resolverSettings: {
	    	minLength: 2,
	        url: '/autocomplete/uuid'
	    }
	})
})
