(function ($) {
	$(document).ready(function () {
		comViaWhatsApp.init();
	});

	var comViaWhatsApp = {
		init: function () {

			this.maskInputs();
			this.validate();

			$('#user_areas_of_interest').click( function () {
				if( $.inArray( 'Todos', $(this).val() ) !== -1 ){
					$('#user_areas_of_interest option').prop('selected', true);
				}
			} )
		},

		maskInputs: function() {
			var SPMaskBehavior = function (val) {
				return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
			},
			spOptions = {
				onKeyPress: function(val, e, field, options) {
						field.mask(SPMaskBehavior.apply({}, arguments), options);
					}
			};

			 $('input[type="tel"]').mask(SPMaskBehavior, spOptions);
		},

		validate: function() {
			$.extend($.validator.messages, {
				required: "Este campo &eacute; obrigatório.",
				email: "Por favor, forne&ccedil;a um e-mail v&aacute;lido.",
				maxlength: $.validator.format("Por favor, forne&ccedil;a n&atilde;o mais que {0} caracteres."),
				minlength: $.validator.format("Por favor, forne&ccedil;a um telefone v&aacute;lido."),
			});

			$("#com-via-whatsapp-form").validate({
				rules: {
					'user_areas_of_interest[]': {
						required: true
					}
				},
				messages: { 
					"user_areas_of_interest[]": "Por favor, selecione ao menos uma área de interesse.",
				},
				highlight: function(label) {
					$(label).closest('.form-group').addClass('has-error');
				},
				success: function(label,element) {
					$(label).closest('.form-group').removeClass('has-error');
				},
				errorElement : 'div',
				errorPlacement: function(error, element) {
					var placement = $(element).closest('.form-group');
					if (placement) {
						$(placement).append(error)
					} else {
						error.insertAfter(element);
					}
				},
				submitHandler: function(form) {
					console.log($(form).valid());
					if ($(form).valid()) {
						form.submit();
					} else {
						return false;
					}
				}
			});

// $(document).ready(function () {
// 	$("form").validate({
// 		invalidHandler: function (e, validator) {
// 			var errors = validator.numberOfInvalids();
// 			if (errors) {
// 				var message = errors == 1 ? 'You missed 1 field. It has been highlighted below' : 'You missed ' + errors + ' fields.  They have been highlighted below';
// 				$("div.error span").html(message);
// 				$("div.error").show();
// 			} else {
// 				$("div.error").hide();
// 			}
// 		},
// 		onkeyup: false,
// 		submitHandler: function () {
// 			$("div.error").hide();
// 			alert("submit! use link below to go to the other step");
// 		},
// 		messages: {
// 			password2: {
// 				required: " ",
// 				equalTo: "Please enter the same password as above"
// 			},
// 			email: {
// 				required: " ",
// 				email: "Please enter a valid email address, example: you@yourdomain.com",
// 				remote: $.validator.format("{0} is already taken, please enter a different address.")
// 			}
// 		},
// 		debug: true
// 	});

		},

		createAgendaCalendar: function () {

		},

	};
})(jQuery);
