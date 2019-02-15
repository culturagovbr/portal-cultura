(function ($) {
	$(document).ready(function () {
		comViaWhatsApp.init();
	});

	var comViaWhatsApp = {
		init: function () {

			this.checkAll();
			this.maskInputs();
			this.validate();

			$('#user_areas_of_interest').click( function () {
				if( $.inArray( 'Todos', $(this).val() ) !== -1 ){
					$('#user_areas_of_interest option').prop('selected', true);
				}
			} )
		},

		checkAll: function() {
			$("#check-all").click(function(){
				$('#com-via-whatsapp-form input:checkbox').not(this).prop('checked', this.checked);
			});
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
		},

		createAgendaCalendar: function () {

		},

	};
})(jQuery);
