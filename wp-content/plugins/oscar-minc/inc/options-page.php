<?php
/**
 * Register our oscar_minc_options_page to the admin_menu action hook
 */
add_action( 'admin_menu', 'oscar_minc_options_page' );
function oscar_minc_options_page() {
    // add top level menu page
    add_submenu_page(
        'edit.php?post_type=inscricao',
        'Configurações Oscar',
        'Configurações',
        'manage_options',
        'inscricao-options-page',
        'oscar_minc_options_page_html'
    );
}

/**
 * top level menu:
 * callback functions
 */
function oscar_minc_options_page_html() {
    // check user capabilities
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    // add error/update messages
    // check if the user have submitted the settings
    // wordpress will add the "settings-updated" $_GET parameter to the url
    if ( isset( $_GET['settings-updated'] ) ) {
        // add settings saved message with the class of "updated"
        add_settings_error( 'oscar_minc_options', 'oscar_minc_options_message', __( 'Configurações salvas', 'oscar' ), 'updated' );
    }
    // show error/update messages
    settings_errors( 'oscar_minc_options' );
    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <form action="options.php" method="post">
            <?php
            // output security fields for the registered setting "wporg"
            settings_fields( 'oscar' );
            // output setting sections and their fields
            // (sections are registered for "wporg", each field is registered to a specific section)
            do_settings_sections( 'oscar' );
            // output save settings button
            submit_button( 'Save Settings' );
            ?>
        </form>
    </div>
    <?php
}

/**
 * register our wporg_settings_init to the admin_init action hook
 */
add_action( 'admin_init', 'oscar_minc_settings_init' );
function oscar_minc_settings_init() {
    register_setting( 'oscar', 'oscar_minc_options', array('sanitize_callback' => 'oscar_sanitize_fields') );

    add_settings_section(
        'oscar_minc_video_upload_section',
        'Formulário de envio de vídeo',
        '',
        'oscar'
    );

    add_settings_section(
        'oscar_minc_mail_confirmation_section',
        'Email de confirmação',
        '',
        'oscar'
    );

    add_settings_section(
        'oscar_minc_deadline_section',
        'Prazo para inscrições',
        '',
        'oscar'
    );

    add_settings_section(
        'oscar_minc_schedule_section',
        'Cronograma',
        '',
        'oscar'
    );

    add_settings_field(
        'oscar_minc_movie_extensions',
        'Extensões permitidas',
        'oscar_minc_movie_extensions',
        'oscar',
        'oscar_minc_video_upload_section',
        [
            'label_for' => 'oscar_minc_movie_extensions',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_movie_max_size',
        'Tamanho máximo para o vídeo',
        'oscar_minc_movie_max_size',
        'oscar',
        'oscar_minc_video_upload_section',
        [
            'label_for' => 'oscar_minc_movie_max_size',
        ]
    );

    add_settings_field(
        'oscar_minc_movie_uploaded_message',
        'Mensagem de sucesso ao enviar o vídeo',
        'oscar_minc_movie_uploaded_message',
        'oscar',
        'oscar_minc_video_upload_section',
        [
            'label_for' => 'oscar_minc_movie_uploaded_message',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_email_from',
        'Email para o remetente',
        'oscar_minc_email_from',
        'oscar',
        'oscar_minc_mail_confirmation_section',
        [
            'label_for' => 'oscar_minc_email_from',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_email_body',
        'Texto para o email de envio de inscrição',
        'oscar_minc_email_body',
        'oscar',
        'oscar_minc_mail_confirmation_section',
        [
            'label_for' => 'oscar_minc_email_body',
            'class' => 'form-field',
        ]
    );
    add_settings_field(
        'oscar_minc_email_body_video_received',
        'Texto para o email de recebimento do vídeo',
        'oscar_minc_email_body_video_received',
        'oscar',
        'oscar_minc_mail_confirmation_section',
        [
            'label_for' => 'oscar_minc_email_body_video_received',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_monitoring_emails',
        'Emails para monitoramento',
        'oscar_minc_monitoring_emails',
        'oscar',
        'oscar_minc_mail_confirmation_section',
        [
            'label_for' => 'oscar_minc_monitoring_emails',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_deadline_time',
        'Data para encerramento das inscrições',
        'oscar_minc_deadline_time',
        'oscar',
        'oscar_minc_deadline_section',
        [
            'label_for' => 'oscar_minc_deadline_time',
            'class' => 'form-field',
        ]
    );

    add_settings_field(
        'oscar_minc_deadline_text',
        'Mensagem para o usuário',
        'oscar_minc_deadline_text',
        'oscar',
        'oscar_minc_deadline_section',
        [
            'label_for' => 'oscar_minc_deadline_text',
            'class' => 'form-field',
        ]
    );

	add_settings_field(
		'oscar_minc_schedule_time_1',
		'1ª Etapa - Data',
		'oscar_minc_schedule_time_1',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_time_1',
			'class' => 'form-field',
		]
	);

	add_settings_field(
		'oscar_minc_schedule_text_1',
		'1ª Etapa - Texto',
		'oscar_minc_schedule_text_1',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_text_1',
			'class' => 'form-field',
		]
	);

	add_settings_field(
		'oscar_minc_schedule_time_2',
		'2ª Etapa - Data',
		'oscar_minc_schedule_time_2',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_time_2',
			'class' => 'form-field',
		]
	);

	add_settings_field(
		'oscar_minc_schedule_text_2',
		'2ª Etapa - Texto',
		'oscar_minc_schedule_text_2',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_text_2',
			'class' => 'form-field',
		]
	);

	add_settings_field(
		'oscar_minc_schedule_time_3',
		'3ª Etapa - Data',
		'oscar_minc_schedule_time_3',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_time_3',
			'class' => 'form-field',
		]
	);

	add_settings_field(
		'oscar_minc_schedule_text_3',
		'3ª Etapa - Texto',
		'oscar_minc_schedule_text_3',
		'oscar',
		'oscar_minc_schedule_section',
		[
			'label_for' => 'oscar_minc_schedule_text_3',
			'class' => 'form-field',
		]
	);
}

function oscar_minc_movie_extensions( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>

    <input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo $options['oscar_minc_movie_extensions']; ?>">
    <p class="description">Defina as extensões permitidas para os vídeos, separando as com vírgulas. Exemplo: mp4, avi, mkv, wmv.</p>
    <?php
}

function oscar_minc_movie_max_size( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>

    <input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="number" value="<?php echo $options['oscar_minc_movie_max_size']; ?>">
    <p class="description">Tamanho em Gigabytes</p>
    <?php
}

function oscar_minc_movie_uploaded_message( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_movie_uploaded_message']; ?></textarea>
    <p class="description">Essa é a mensagem que o usuário verá ao enviar um vídeo com sucesso, além disso, um email de confirmação com esta mensagem será enviado para o mesmo.</p>
    <?php
}

function oscar_minc_email_from( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>

    <input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo $options['oscar_minc_email_from']; ?>">
    <p class="description">Remetente para todos os emails enviados.</p>
    <?php
}

function oscar_minc_email_body( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_email_body']; ?></textarea>
    <p class="description">Mensagem recebida pelo usuário ao realizar uma inscrição.</p>
    <?php
}

function oscar_minc_email_body_video_received( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_email_body_video_received']; ?></textarea>
    <p class="description">Mensagem recebida pelo usuário após o correto envio do filme.</p>
 <?php
}

function oscar_minc_monitoring_emails( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo $options['oscar_minc_monitoring_emails']; ?>">
    <p class="description">
        Estes emails receberão uma notificação sempre que for realizado uma inscrição ou edição do formulário de inscrição ao Oscar 2018. Separe múltiplos emails com vírgulas.
    </p>
    <?php
}

function oscar_minc_deadline_time( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo date('d/m/Y H:i', strtotime($options['oscar_minc_deadline_time'])); ?>" placeholder="__/__/____ HH:MM">
    <p class="description">Seguindo o seguinte padrão: <b>DD/MM/AAAA 24:59</b></p>
    <?php
}

function oscar_minc_deadline_text( $args ) {
    $options = get_option( 'oscar_minc_options' ); ?>
    <textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_deadline_text']; ?></textarea>
    <p class="description">Esta mensagem será visível na tela de inscrições do proponente.</p>
    <?php
}

function oscar_minc_schedule_time_1( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo date('d/m/Y H:i', strtotime($options['oscar_minc_schedule_time_1'])); ?>" placeholder="__/__/____ HH:MM">
	<p class="description">Seguindo o seguinte padrão: <b>DD/MM/AAAA 24:59</b></p>
	<?php
}

function oscar_minc_schedule_text_1( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_schedule_text_1']; ?></textarea>
	<p class="description">Esta mensagem será visível na tela inicial na seção cronograma 1ª etapa.</p>
	<?php
}

function oscar_minc_schedule_time_2( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo date('d/m/Y H:i', strtotime($options['oscar_minc_schedule_time_2'])); ?>" placeholder="__/__/____ HH:MM">
	<p class="description">Seguindo o seguinte padrão: <b>DD/MM/AAAA 24:59</b></p>
	<?php
}

function oscar_minc_schedule_text_2( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_schedule_text_1']; ?></textarea>
	<p class="description">Esta mensagem será visível na tela inicial na seção cronograma 2ª etapa.</p>
	<?php
}

function oscar_minc_schedule_time_3( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<input id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" type="text" value="<?php echo date('d/m/Y H:i', strtotime($options['oscar_minc_schedule_time_3'])); ?>" placeholder="__/__/____ HH:MM">
	<p class="description">Seguindo o seguinte padrão: <b>DD/MM/AAAA 24:59</b></p>
	<?php
}

function oscar_minc_schedule_text_3( $args ) {
	$options = get_option( 'oscar_minc_options' ); ?>
	<textarea id="<?php echo esc_attr( $args['label_for'] ); ?>" name="oscar_minc_options[<?php echo esc_attr( $args['label_for'] ); ?>]" rows="3"><?php echo $options['oscar_minc_schedule_text_1']; ?></textarea>
	<p class="description">Esta mensagem será visível na tela inicial na seção cronograma 3ª etapa.</p>
	<?php
}

function oscar_sanitize_fields ( $input ){
    $date_arr = explode(' ', $input['oscar_minc_deadline_time']);
	$raw_date = implode('/', array_reverse(explode('-', $date_arr[0])));
    $raw_date = implode('-',array_reverse(explode('/',$raw_date)));
    $raw_time = $date_arr[1] . ':00';
	$input['oscar_minc_deadline_time'] = $raw_date . ' ' . $raw_time;

	for ($i = 1; $i <= 3; $i++) {
		$date_arr = explode(' ', $input['oscar_minc_schedule_time_' . $i]);
		$raw_date = implode('/', array_reverse(explode('-', $date_arr[0])));
		$raw_date = implode('-',array_reverse(explode('/',$raw_date)));
		$raw_time = $date_arr[1] . ':00';
		$input['oscar_minc_schedule_time_' . $i] = $raw_date . ' ' . $raw_time;
	}

	return $input;
}