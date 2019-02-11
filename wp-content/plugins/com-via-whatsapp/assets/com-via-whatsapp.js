(function ($) {
	$(document).ready(function () {
		comViaWhatsApp.init();
	});

	var comViaWhatsApp = {
		init: function () {

			$('#user_areas_of_interest').click( function () {
				if( $.inArray( 'Todos', $(this).val() ) !== -1 ){
					$('#user_areas_of_interest option').prop('selected', true);
				}
			} )
		},

		createAgendaCalendar: function () {

		},

	};
})(jQuery);
