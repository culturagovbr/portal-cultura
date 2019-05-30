(function($) {
    $(document).ready(function() {
        oscar.init();
        oscar.mainFormUtils();
        oscar.uploadProcess();
        oscar.supportModal();
    });

    var oscar = {
        init: function() {

            var SPMaskBehavior = function (val) {
                    return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
                },
                spOptions = {
                    onKeyPress: function(val, e, field, options) {
                        field.mask(SPMaskBehavior.apply({}, arguments), options);
                    }
                };

            $('[data-toggle="tooltip"]').tooltip();
            $('#reg-cnpj').mask('00.000.000/0000-00');
            $('#zipcode').mask('00000-000');
            $('#phone').mask(SPMaskBehavior, spOptions);
        },

        mainFormUtils: function () {
            if( !$('#oscar-main-form').length ){
                return;
            }

            // Masks
            $('div[data-name="mes_ano_de_finalizacao"] input').mask('00/0000');
            $('div[data-name="ano_de_estreia"] input, div[data-name="data_de_estreia"] input').mask('00/00/0000');

            // Chars counter for textarea with limits
            function countChars(limit, input) {
                if( input.parent().parent().find('.acf-label .description .remaining-chars').length === 0 ){
                    input.parent().parent().find('.acf-label .description').append('<span class="remaining-chars">Caracteres restantes: <b></b></span>');
                }
                $('.remaining-chars b').html(( limit - input.val().length ));
            };
            $('div[data-name="breve_sinopse_em_portugues"] textarea').on('keyup', function () {
                var maxLength = parseInt( $(this).attr('maxlength') );
                countChars(maxLength, $(this));
            });

            $('div[data-name="aspect_ratio_outros"] input, div[data-name="formato_de_projecao_outros"] input, div[data-name="som_outros"] input').attr('disabled', true);

            // Disable/Enable inputs, based on other selected options
            function enableOtherInput(input, optionToCheck, inputToEnable) {
                if( input.val() === optionToCheck ){
                    $(inputToEnable).removeAttr('disabled');
                } else {
                    $(inputToEnable).attr('disabled', true);
                }
            }

            $('div[data-name="formato_de_projecao"] select').on('change', function () {
                var inputToEnable = $('div[data-name="formato_de_projecao_outros"] input');
                enableOtherInput($(this), 'Outro', inputToEnable);
            });

            $('div[data-name="aspect_ratio"] select').on('change', function () {
                var inputToEnable = $('div[data-name="aspect_ratio_outros"] input');
                enableOtherInput($(this), 'Outro', inputToEnable);
            });

            $('div[data-name="som"] select').on('change', function () {
                var inputToEnable = $('div[data-name="som_outros"] input');
                enableOtherInput($(this), 'Outro', inputToEnable);
            });
        },

        uploadProcess: function () {
            // Validate movie file
            $(document).on('change', '#oscar-video', function(e) {
                // console.log($('#oscar-video')[0].files[0]);
                if ($(this)[0].files[0]) {
                    var errors = validateMovie( $('#oscar-video')[0].files[0] );
                    if( errors.length ){
                        $('#error-alert').removeClass('d-none').html('');
                        $('#oscar-video-upload-btn').attr('disabled', 'disabled');
                        $.each(errors, function (i, error) {
                            $('#error-alert').removeClass('d-none').append('<p><b>Erro: </b>' + error + '</p>');
                        });
                    } else {
                        $('#error-alert').addClass('d-none');
                        $('#oscar-video-name').text($(this)[0].files[0].name);
                        $('#oscar-video-upload-btn').removeAttr('disabled');
                        $('#oscar-video-form .video-drag-area').addClass('ready-to-upload');
                    }
                } else {
                    $('#oscar-video-name').text('');
                    $('#oscar-video-upload-btn').attr('disabled', 'disabled');
                    $('#oscar-video-form .video-drag-area').removeClass('ready-to-upload');
                }

                function validateMovie(movieObj) {
                    var errors = [];
                    if( movieObj.size >  $('#movie_max_size').val() ){
                        errors.push('O tamanho do arquivo excede o limite permitido.');
                    }

                    if( movieObj.type !== 'video/mp4' && movieObj.type !== 'video/avi' && movieObj.type !== 'video/quicktime' ){
                        errors.push('O formato do arquivo não é permitido.');
                    }

                    return errors;
                }
            });


            $("#oscar-video-form").on('submit', function(e) {
                e.preventDefault();
                $('#info-alert, #oscar-video-form .video-drag-area').addClass('d-none');
                $('#oscar-video-form .myprogress').css('width', '0');
                $('#oscar-video-form .msg').text('');

                var oscarVideo = $('#oscar-video').val();
                if (oscarVideo == '') {
                    alert('Por favor, selecione um arquivo para upload.');
                    return;
                }

                var formData = new FormData();
                formData.append('nonce', oscar_minc_vars.upload_file_nonce);
                formData.append('oscarVideo', $('#oscar-video')[0].files[0]);
                formData.append('action', 'upload_oscar_video');
                formData.append('post_id', $('#post_id').val());
                $('#oscar-video-form .msg').text('Upload em progresso, por favor, aguarde...');
                $.ajax({
                    url: oscar_minc_vars.ajaxurl,
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    beforeSend: function () {
                        $('#upload-status').removeClass('hidden');
                        $('#oscar-video-upload-btn').text('Enviando vídeo').attr('disabled', 'disabled').hide();
                        notifyUplodStart( $('#oscar-video')[0].files[0] );
                    },
                    // this part is progress bar
                    xhr: function () {
                        var xhr = new window.XMLHttpRequest();
                        xhr.upload.addEventListener("progress", function (evt) {
                            if (evt.lengthComputable) {
                                var percentComplete = evt.loaded / evt.total;
                                percentComplete = parseInt(percentComplete * 100);
                                $('#oscar-video-form .myprogress').text(percentComplete + '%');
                                $('#oscar-video-form .myprogress').css('width', percentComplete + '%');
                                if( percentComplete === 100 ){
                                    $('#oscar-video-form .msg').html('Finalizando o processo de envio do filme. Por favor, aguarde mais um pouco.');
                                    $('#upload-status .progress .progress-bar').text('Processando');
                                }
                            }
                        }, false);
                        return xhr;
                    },
                    success: function (res) {
                        // console.log(res);
                        if( res.success ){
                            $('#oscar-video-form .msg').addClass('success');
                            $('#oscar-video-form .msg').html(res.data);
                            $('#oscar-video-upload-btn').hide();
                            $('#oscar-video-form .myprogress').removeClass('progress-bar-animated');
                            $('#upload-status .progress .progress-bar').addClass('bg-success').text('Sucesso');
                        } else {
                            $('#oscar-video-form .myprogress').text('0%');
                            $('#oscar-video-form .myprogress').css('width', '0%');
                            $('#oscar-video-form .msg').html(res.data);
                        }
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        console.error( 'Error on sending video', jqXHR, textStatus, errorThrown );
                        notifyErrorOnUplod( $('#oscar-video')[0].files[0] );
                        $('#error-alert').removeClass('d-none').html('<p>Ocorreu um <b>erro</b> em nosso sistema ao enviar seu filme. Nossa equipe técnica foi avisada e entrará em contato após a resolução do problema.</p>');
                        $('#oscar-video-form .myprogress').removeClass('progress-bar-animated');
                        $('#upload-status .progress .progress-bar').addClass('bg-danger').text('Erro');
                        $('#upload-status .panel').hide();
                    }
                });
            });

            function notifyErrorOnUplod( movieData ) {
                // console.log( movieData, jQuery.browser );
                var movieName = movieData.name,
                    movieSize = movieData.size,
                    movieType = movieData.type;
                $.ajax({
                    url: oscar_minc_vars.ajaxurl,
                    data: {
                        action: 'error_on_upload_oscar_video',
                        movie_name: movieName,
                        movie_size: movieSize,
                        movie_type: movieType,
                        browser_codename: navigator.appCodeName,
                        browser_name: navigator.appName,
                        browser_version: navigator.appVersion,
                        so: navigator.platform
                    },
                    type: 'POST',
                    success: function (res) {
	                    // console.log(res);
	                    console.log('Notify error on upload successfully!');
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        console.error( jqXHR, textStatus, errorThrown );
                    }
                });
            }

            function notifyUplodStart( movieData ) {
                var movieName = movieData.name,
                    movieSize = movieData.size,
                    movieType = movieData.type;
                $.ajax({
                    url: oscar_minc_vars.ajaxurl,
                    data: {
                        action: 'upload_start_oscar_video',
                        movie_name: movieName,
                        movie_size: movieSize,
                        movie_type: movieType,
                        browser_codename: navigator.appCodeName,
                        browser_name: navigator.appName,
                        browser_version: navigator.appVersion,
                        so: navigator.platform
                    },
                    type: 'POST',
                    success: function (res) {
                        // console.log(res);
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        // console.error( jqXHR, textStatus, errorThrown );
                    }
                });
            }
        },

        supportModal: function () {
            var modalLocked = false;

            $('#support-modal').on('hide.bs.modal', function (event) {
                if( modalLocked ){
                    return false;
                }
            });

            $('#support-modal').on('show.bs.modal', function (event) {
                var button = $(event.relatedTarget),
                    movieName = button.data('movie-name'),
                    postID = button.data('post-id');

                $('#support-reason').val('');
                $('#support-message').val('');
                $('#support-form .alert').addClass('d-none');
                $('#support-form .form-fields, #support-form .modal-footer .btn-primary').removeClass('d-none');
                $('#support-form .modal-footer .btn-secondary').text('Cancelar');
                $('#support-reason, #support-message').removeAttr('disabled');
                $('#support-form .modal-footer .btn-primary').removeAttr('disabled').html('Enviar');

                $('#movie-name').val(movieName);
                $('#post-id').val(postID);
            });

            $("#support-form").on('submit', function(e) {
                e.preventDefault();

                var postID = $('#post-id').val(),
                    supportReason = $('#support-reason').val(),
                    supportMessage = $('#support-message').val();

                $.ajax({
                    url: oscar_minc_vars.ajaxurl,
                    data: {
                        action: 'support_message',
                        post_id: postID,
                        support_reason: supportReason,
                        support_message: supportMessage
                    },
                    type: 'POST',
                    beforeSend: function () {
                        $('#support-reason, #support-message').attr('disabled', true);
                        $('#support-form .modal-footer .btn-primary').attr('disabled', true).html('Enviando <i class="fa-spin fa fa-circle-o-notch" aria-hidden="true"></i>');
                        modalLocked = true;
                    },
                    success: function ( res ) {
                        // console.log( res );
                        $('#support-form .form-fields, #support-form .modal-footer .btn-primary').addClass('d-none');
                        $('#support-form .modal-footer .btn-secondary').text('Fechar');
                        if( res.success ){
                            $('#support-form .alert-success').removeClass('d-none').text(res.data);
                        } else {
                            $('#support-form .alert-danger').removeClass('d-none').text(res.data);
                        }
                        modalLocked = false;
                    },
                    error: function( jqXHR, textStatus, errorThrown ) {
                        // console.error( jqXHR, textStatus, errorThrown );
                        $('#support-form .alert-success').removeClass('d-none').text(errorThrown);
                    }
                });

            });
        }
    };
})(jQuery);