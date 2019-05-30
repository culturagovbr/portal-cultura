<?php
/**
 * Plugin Name:       Oscar Minc
 * Plugin URI:        https://github.com/culturagovbr/
 * Description:       @TODO
 * Version:           1.1.0
 * Author:            Ricardo Carvalho
 * Author URI:        https://github.com/darciro/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

if (!class_exists('OscarMinC')) :

    class OscarMinC
    {
        public function __construct()
        {
            require_once dirname( __FILE__ ) . '/inc/options-page.php';

            register_activation_hook(__FILE__, array($this, 'activate_oscar_minc'));
            add_action('init', array($this, 'inscricao_cpt'));
            add_filter('manage_inscricao_posts_columns', array($this, 'add_inscricao_columns'));
			add_action('add_meta_boxes_inscricao', array($this, 'oscar_minc_meta_boxes') );
			add_action('save_post_inscricao', array($this, 'oscar_video_save_post_meta_box') );
            add_action('manage_posts_custom_column', array($this, 'inscricao_custom_columns'), 10, 2);
            add_action('init', array($this, 'oscar_shortcodes'));
            add_action('acf/pre_save_post', array($this, 'preprocess_main_form'));
            add_action('acf/save_post', array($this, 'postprocess_main_form'));
            add_action('acf/load_field', array($this, 'main_form_bootstrap_utils'));
            add_action('get_header', 'acf_form_head');
            add_action('wp_enqueue_scripts', array($this, 'register_oscar_minc_styles'));
            add_action('admin_enqueue_scripts', array($this, 'register_oscar_minc_admin_styles'));
            add_action('wp_enqueue_scripts', array($this, 'register_oscar_minc_scripts'));
            add_action('admin_enqueue_scripts', array($this, 'register_oscar_minc_admin_scripts'));
            add_filter('wp_mail_content_type', array($this, 'set_email_content_type'));
            add_filter('wp_mail_from', array($this, 'oscar_minc_wp_mail_from'));
            add_filter('wp_mail_from_name', array($this, 'oscar_minc_wp_mail_from_name'));
            add_action('wp_ajax_upload_oscar_video', array($this, 'upload_oscar_video'));
            add_action('wp_ajax_nopriv_upload_oscar_video', array($this, 'upload_oscar_video'));
            add_action('show_user_profile', array($this, 'oscar_user_cnpj_field'));
            add_action('edit_user_profile', array($this, 'oscar_user_cnpj_field'));
            add_action('personal_options_update', array($this, 'update_user_cnpj'));
            add_action('edit_user_profile_update', array($this, 'update_user_cnpj'));
            add_action('template_redirect', array($this, 'redirect_to_auth'));
            add_action('login_redirect', array($this, 'oscar_login_redirect'), 10, 3);
            add_action('after_setup_theme', array($this, 'remove_admin_bar'));
            add_action('wp_ajax_error_on_upload_oscar_video', array($this, 'error_on_upload_oscar_video'));
            add_action('wp_ajax_nopriv_error_on_upload_oscar_video', array($this, 'error_on_upload_oscar_video'));
            add_action('wp_ajax_support_message', array($this, 'support_message'));
            add_action('wp_ajax_nopriv_support_message', array($this, 'support_message'));
            add_action('wp_login_failed', array($this, 'front_end_login_fail'), 10, 2);
            add_action('login_form_middle', array($this, 'add_lost_password_link'));
			add_action('login_form_lostpassword', array( $this, 'redirect_to_custom_lostpassword' ));
			add_action('login_form_lostpassword', array( $this, 'do_password_lost' ) );
			add_filter('retrieve_password_message', array( $this, 'replace_retrieve_password_message' ), 10, 4);
			add_action('check_admin_referer', array( $this, 'logout_without_confirmation' ), 10, 2);
			add_action('admin_init', array( $this, 'add_committee_role' ));
			add_action('admin_init', array( $this, 'remove_menus_based_on_roles' ), 999);
			add_action('admin_menu', array( $this, 'modify_menu_based_on_roles' ), 999);
			add_action('admin_bar_menu', array( $this, 'remove_toolbar_node_based_on_roles' ), 999);
			add_action('admin_head', array( $this, 'admin_oscar_roles_style' ), 999);
			add_action('pre_get_posts', array( $this, 'filter_posts_list' ), 1);
			add_filter('wp_nav_menu_items', array($this, 'add_menu_item'), 10, 2);
			add_action('wp_mail_failed', array( $this, 'action_wp_mail_failed' ), 10, 1);
            add_action('wp_ajax_upload_start_oscar_video', array($this, 'upload_start_oscar_video'));
            add_action('wp_ajax_nopriv_upload_start_oscar_video', array($this, 'upload_start_oscar_video'));
            add_action('init', array($this, 'oscar_editor_manage_users'));
        }

        /**
         * Fired during plugin activation, check for dependency
         *
         */
        public static function activate_oscar_minc()
        {
            if (!is_plugin_active('advanced-custom-fields-pro/acf.php') && !is_plugin_active('advanced-custom-fields/acf.php')) {
                echo 'Para que este plugin funcione corretamente, é necessário a instalação e ativação do plugin ACF - <a href="http://advancedcustomfields.com/" target="_blank">Advanced custom fields</a>.';
                die;
            }
        }

        /**
         * Create a custom post type to manage indications
         *
         */
        public function inscricao_cpt()
        {
            register_post_type('inscricao', array(
                    'labels' => array(
                        'name' => 'Inscrições Oscar',
                        'singular_name' => 'Inscrição',
                        'add_new' => 'Nova inscrição',
                        'add_new_item' => 'Nova inscrição',
                        'search_items' => 'Procurar inscrição',
                        'not_found' => 'Nenhuma inscrição encontrada',
                    ),
                    'description' => 'Inscrições OscarMinC',
                    'public' => true,
                    'exclude_from_search' => false,
                    'publicly_queryable' => false,
                    'supports' => array('title'),
                    'menu_icon' => 'dashicons-clipboard')
            );

			if(!empty($_GET['movie'])){
				$this->download_movie_attachment( $_GET['movie'] );
			}
        }

		/**
         * Add's a meta box for showing movie data
         *
		 * @param $post
		 */
		public function oscar_minc_meta_boxes( $post ) {
			add_meta_box(
				'oscar-video-post',
				'Dados do filme',
				array($this, 'oscar_video_post_meta_box'),
				'inscricao',
				'side',
				'high'
			);
		}

		/**
         * Render a meta box for showing movie data
         *
		 * @param $post
		 */
		public function oscar_video_post_meta_box( $post ) {
			$oscar_movie_id = get_post_meta($post->ID, 'movie_attachment_id', true);
			$movie_enabled_to_comission = get_post_meta($post->ID, 'movie_enabled_to_comission', true);
			$post_author_id = get_post_field('post_author', $post->ID);
			$post_author = get_user_by('id', $post_author_id);
			add_thickbox(); ?>

            <div id="oscar-movie-id-<?php echo $post->ID; ?>" class="oscar-thickbox-modal">
                <div class="oscar-thickbox-modal-body">
					<?php echo do_shortcode('[video src="'. wp_get_attachment_url( $oscar_movie_id ) .'"]'); ?>
                    <h3>Filme: <?php echo get_field('titulo_do_filme', $post->ID); ?> <a href="<?php echo wp_get_attachment_url( $oscar_movie_id ); ?>" target="_blank"><span class="dashicons dashicons-download"></span> Baixar filme</a></h3>
                    <p>Proponente: <b><?php echo $post_author->display_name; ?></b></p>
                    <div class="movie-desc">
						<?php echo get_field('breve_sinopse_em_portugues', $post->ID); ?>
                    </div>
                </div>
            </div>

            <div class="misc-pub-section">
                Filme: <b><?php echo $oscar_movie_id ? '<a href="#TB_inline?width=600&height=500&inlineId=oscar-movie-id-'. $post->ID .'" class="thickbox oscar-thickbox-link" target="_blank">' . get_field('titulo_do_filme', $post->ID) . '</a>' : get_field('titulo_do_filme', $post->ID) .' (Filme não enviado)'; ?></b>
            </div>
            <div class="misc-pub-section">
                <label for="enable-movie-to-comission">
                    <input id="enable-movie-to-comission" name="enable-movie-to-comission" type="checkbox" value="1" <?php echo $oscar_movie_id ? '' : 'disabled'; ?> <?php echo $movie_enabled_to_comission ? 'checked="true"' : ''; ?>>
                    Habilitar filme para a comissão.
                </label>
            </div>
            <div class="misc-pub-section">
                <label for="detach-movie-id">
                    <input id="detach-movie-id" name="detach-movie-id" type="checkbox" value="1" onclick="confirmDetach()" <?php echo $oscar_movie_id ? '' : 'disabled'; ?>>
                    Desvincular vídeo da inscrição
                </label>
                <p class="description">Isso permite que o proponente possa reenviar o filme para esta inscrição.</p>
            </div>
            <script type="text/javascript">
                function confirmDetach() {
                    var check = window.document.getElementById('detach-movie-id').checked,
                        str = 'Tem certeza que deseja desvincular o filme para esta inscrição? Isso não poderá ser desfeito.',
                        detachInput = document.getElementById('detach-movie-id');

                    if (detachInput.checked === true) {
                        if (window.confirm(str)) {
                            detachInput.checked = check;
                            window.document.getElementById('enable-movie-to-comission').checked = false;
                            jQuery('#enable-movie-to-comission').attr('disabled', true);
                        } else {
                            detachInput.checked = (!check);
                            jQuery('#enable-movie-to-comission').removeAttr('disabled');
                        }
                    }
                }
            </script>
			<?php
			$current_user = wp_get_current_user();
			if( $current_user->roles[0] === 'administrator' ): ?>
				<div class="misc-pub-section">
					<label for="attach-movie-manually">
						Vincular vídeo manualmente
					</label>
					<input id="attach-movie-manually" name="attach-movie-manually" type="number" value="<?php echo $oscar_movie_id ? $oscar_movie_id : ''; ?>">
					<p class="description">Insira a Identificação (attachment ID) do vídeo. <b>Atenção</b>, isso irá sobrescrever o vídeo já enviado pelo proponente!</p>
				</div>
			<?php endif; ?>
		<?php }

		/**
         * Handle data process for meta box
         *
		 * @param $post_id
		 * @return mixed
		 */
		public function oscar_video_save_post_meta_box( $post_id )
        {
			if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
				return $post_id;
			}

			if ( ! current_user_can( 'edit_post', $post_id ) ) {
				return $post_id;
			}

			if ( isset( $_POST['post_type'] ) && 'inscricao' === $_POST['post_type'] ) {

			    if( update_post_meta($post_id, 'movie_enabled_to_comission', $_POST['enable-movie-to-comission']) ){

			        if( !empty( $_POST['enable-movie-to-comission'] ) ){
						// Notifies committee about the newly enabled movie
						$committee_users = get_users( array( 'role' => 'committee' ) );
						$committee_users_emails = [];
						foreach ( $committee_users as $user ) {
							array_push($committee_users_emails, $user->user_email);
						}
						$oscar_minc_options = get_option('oscar_minc_options');
						$to = $committee_users_emails;
						$headers[] = 'From: ' . bloginfo('name') . ' <automatico@cultura.gov.br>';
						$headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
						$subject = 'Novo filme para avaliação em Brasil no Oscar.';

						$msg  = 'O filme '. get_field('titulo_do_filme', $post_id) .', acaba de ser habilitado para sua avaliação no site Brasil no Oscar.<br>';
						$msg .= '<br>Para visualiza-lo, clique <a href="' . admin_url('edit.php?post_type=inscricao') . '" style="color: rgb(206, 188, 114); text-decoration: none">aqui</a>.';
						$body = $this->get_email_template('admin', $msg);

						if (!wp_mail($to, $subject, $body, $headers)) {
							$emails_failed = implode(', ', $to);
							error_log("ERRO: O envio de emails para a comissão falhou. Lista de emails: " . $emails_failed, 0);
						}
                    }

                }

				if( isset( $_POST['detach-movie-id'] ) ){
					delete_post_meta( $post_id, 'movie_enabled_to_comission');
					delete_post_meta( $post_id, 'movie_attachment_id');
                }

				if( isset( $_POST['attach-movie-manually'] ) ){
					update_post_meta($post_id, 'movie_attachment_id', $_POST['attach-movie-manually']);
				}

			}
        }

        /**
         * Add new columns to our custom post type
         *
         * @param $columns
         * @return array
         */
        public function add_inscricao_columns($columns)
        {
            unset($columns['author']);
            return array_merge($columns, array(
                'responsible' => 'Proponente',
                'user_cnpj' => 'CNPJ',
                'movie' => 'Filme'
            ));
        }

        /**
         * Fill custom columns with data
         *
         * @param $column
         * @param $post_id
         */
        public function inscricao_custom_columns($column, $post_id)
        {
            $post_author_id = get_post_field('post_author', $post_id);
            $post_author = get_user_by('id', $post_author_id);
			add_thickbox();

            switch ($column) {
                case 'responsible':
                    if( current_user_can('administrator') || current_user_can('editor') ){
						echo '<a href="'. admin_url('/user-edit.php?user_id=') . $post_author_id . '">' . $post_author->display_name . '</a>';
                    } else {
						echo $post_author->display_name;
                    }
                    break;
                case 'user_cnpj':
                    echo $this->mask(get_user_meta($post_author_id, '_user_cnpj', true), '##.###.###/####-##');
                    break;
                case 'movie':
					$oscar_movie_id = get_post_meta( $post_id, 'movie_attachment_id', true ); ?>

                    <div id="oscar-movie-id-<?php echo $post_id; ?>" class="oscar-thickbox-modal">
                        <div class="oscar-thickbox-modal-body">
                            <?php echo do_shortcode('[video src="'. wp_get_attachment_url( $oscar_movie_id ) .'"]'); ?>
                            <h3>Filme: <?php echo get_field('titulo_do_filme', $post_id); ?> <a href="<?php echo admin_url( 'edit.php?post_type=inscricao&movie=' . $oscar_movie_id ); ?>"><span class="dashicons dashicons-download"></span> Baixar filme</a></h3>
                            <p>Proponente: <b><?php echo $post_author->display_name; ?></b></p>
                            <div class="movie-desc">
                                <?php echo get_field('breve_sinopse_em_portugues', $post_id); ?>
                            </div>
                        </div>
                    </div>

                    <?php if($oscar_movie_id): ?>
                        <a href="#TB_inline?width=600&height=500&inlineId=oscar-movie-id-<?php echo $post_id ?>" class="thickbox oscar-thickbox-link">
                            <span class="dashicons dashicons-format-video"></span>
                            <?php the_field('titulo_do_filme', $post_id) ?><br>
                            <small style="color: green;" class="movie-status ok">Filme enviado</small>
                        </a>
                    <?php else: ?>
                        <span class="dashicons dashicons-format-video" style="opacity: 0.5;"></span>
                        <?php the_field('titulo_do_filme', $post_id) ?><br>
                        <small style="color: red;" class="movie-status">Filme não enviado</small>
                    <?php endif;

                    break;
            }
        }

        /**
         * Shortcode to show ACF form
         *
         * @param $atts
         * @return string
         */
        public function oscar_shortcodes($atts)
        {
            require_once plugin_dir_path( __FILE__ ) . 'inc/shortcodes.php';
            $oscar_minc_shortcodes = new Oscar_Minc_Shortcodes();
        }

        /**
         * Process data before save indication post
         *
         * @param $post_id
         * @return int|void|WP_Error
         */
        public function preprocess_main_form($post_id)
        {
            if ($post_id != 'new_inscricao') {
                return $post_id;
            }

            if (is_admin()) {
                return;
            }

            $post = get_post($post_id);
            $post = array('post_type' => 'inscricao', 'post_status' => 'publish');
            $post_id = wp_insert_post($post);

            $inscricao = array('ID' => $post_id, 'post_title' => 'Inscrição - (ID #' . $post_id . ')');
            wp_update_post($inscricao);

            // Return the new ID
            return $post_id;
        }

        /**
         * Notify the monitors about a new indication
         *
         * @param $post_id
         */
        public function postprocess_main_form($post_id)
        {
			$update = get_post_meta( $post_id, '_inscription_validated', true );
			if ( $update ) {
				return;
			}

			$user = wp_get_current_user();
			$user_cnpj = get_user_meta( $user->ID, '_user_cnpj', true );
			$oscar_minc_options = get_option('oscar_minc_options');
            $monitoring_emails = explode(',', $oscar_minc_options['oscar_minc_monitoring_emails']);
            $to = array_map('trim', $monitoring_emails);
            $headers[] = 'From: ' . bloginfo('name') . ' <automatico@cultura.gov.br>';
            $headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
            $subject = 'Nova inscrição ao Oscar.';

			$msg  = 'Uma nova inscrição foi recebida em Oscar.<br>';
			$msg .= 'Proponente: <b>' . $user->display_name . '</b><br>';
			$msg .= 'CNPJ: <b>' . $this->mask($user_cnpj, '##.###.###/####-##') . '</b><br>';
			$msg .= 'Filme: <b>' . get_field('titulo_do_filme', $post_id) . '</b>';
			$msg .= '<br>Para visualiza-la, clique <a href="' . admin_url('post.php?post=' . $post_id . '&action=edit') . '" style="color: rgb(206, 188, 114); text-decoration: none">aqui</a>.';
			$body = $this->get_email_template('admin', $msg);

            if (!wp_mail($to, $subject, $body, $headers)) {
                error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
            }

			add_post_meta($post_id, '_inscription_validated', true, true);

            // Notify the user about its subscription sent
			$to = $user->user_email;
			$subject = 'Sua inscrição foi recebida.';

			$body = $this->get_email_template('user', $oscar_minc_options['oscar_minc_email_body']);

			if (!wp_mail($to, $subject, $body, $headers)) {
				error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
			}

        }

		/**
         * Add bootstrap class to inputs in oscar main form
         *
		 * @param $field
		 * @return mixed
		 */
        public function main_form_bootstrap_utils( $field )
        {
			$field['class'] = 'form-control';

			return $field;
        }

        /**
         * Register stylesheet for our plugin
         *
         */
        public function register_oscar_minc_styles()
        {
            wp_register_style('oscar-minc-styles', plugin_dir_url(__FILE__) . 'assets/oscar-minc.css');
            wp_enqueue_style('oscar-minc-styles');
        }

        /**
         * Register stylesheet admin pages
         *
         */
        public function register_oscar_minc_admin_styles()
        {
            wp_register_style('oscar-minc-admin-styles', plugin_dir_url(__FILE__) . 'assets/oscar-minc-admin.css');
            wp_enqueue_style('oscar-minc-admin-styles');
        }

        /**
         * Register JS for our plugin
         *
         */
        public function register_oscar_minc_scripts()
        {
            wp_enqueue_script('jquery-mask', plugin_dir_url(__FILE__) . 'assets/jquery.mask.min.js', array('jquery'), false, true);
            wp_enqueue_script('oscar-minc-scripts', plugin_dir_url(__FILE__) . 'assets/oscar-minc.js', array('jquery'), false, true);
            wp_localize_script( 'oscar-minc-scripts', 'oscar_minc_vars', array(
                    'ajaxurl' => admin_url( 'admin-ajax.php' ),
                    'upload_file_nonce' => wp_create_nonce( 'oscar-video' ),
                )
            );
        }

        /**
         * Register JS for admin pages
         *
         */
        public function register_oscar_minc_admin_scripts()
        {
			wp_enqueue_script('jquery-mask', plugin_dir_url(__FILE__) . 'assets/jquery.mask.min.js', array('jquery'), false, true);
            wp_enqueue_script('oscar-minc-admin-scripts', plugin_dir_url(__FILE__) . 'assets/oscar-minc-admin.js', array('jquery'), false, true);
        }

        /**
         * Set the mail content to accept HTML
         *
         * @param $content_type
         * @return string
         */
        public function set_email_content_type($content_type)
        {
            return 'text/html';
        }

        /**
         * Set email sender
         *
         * @param $content_type
         * @return mixed
         */
        public function oscar_minc_wp_mail_from($content_type)
        {
            $oscar_minc_options = get_option('oscar_minc_options');
            return $oscar_minc_options['oscar_minc_email_from'];
        }

        /**
         * Set sender name for emails
         *
         * @param $name
         * @return mixed
         */
        public function oscar_minc_wp_mail_from_name($name)
        {
            $oscar_minc_options = get_option('oscar_minc_options');
            return $oscar_minc_options['oscar_minc_email_from_name'];
        }

		/**
		 * Handle the upload process for the movies
         *
		 */
        public function upload_oscar_video()
        {
            check_ajax_referer( 'oscar-video', 'nonce' );

			// error_reporting(0);
			// @ini_set('display_errors',0);
			if (isset($_POST) and $_SERVER['REQUEST_METHOD'] == "POST") {
				if( get_post_meta( $_POST['post_id'], 'movie_attachment_id', true ) ){
					error_log('A inscrição : ' . $_POST['post_id'] . ' tentou reenviar o vídeo', 0);
					wp_send_json_error( 'Seu vídeo já foi enviado.' );
					die;
				}

				$oscar_minc_options = get_option('oscar_minc_options');
				$valid_formats =  $oscar_minc_options['oscar_minc_movie_extensions'] ? explode(', ', $oscar_minc_options['oscar_minc_movie_extensions']) : array('mp4');
				$size = $_FILES['oscarVideo']['size']; // Get the size of the file
				$ext  = explode('/', $_FILES['oscarVideo']['type'] )[1]; // Extract the extension of the file

                // Check for mov extension file type
                if( array_search('mov', $valid_formats) ){
					$ext_mov = array_search('mov', $valid_formats);
					$valid_formats[$ext_mov] = 'quicktime';
                }

				if (in_array($ext, $valid_formats)) {
					if ( $size < intval($oscar_minc_options['oscar_minc_movie_max_size']) * pow(1024,3) ) {
						$attachment_id = media_handle_upload( 'oscarVideo', $_POST['post_id'] );
						if ( is_wp_error( $attachment_id ) ) {
							// There was an error uploading the image.
							error_log('Houve um problema ao enviar o vídeo com inscrição: ' . $_POST['post_id'] . ', Erro: ' . $attachment_id->get_error_message(), 0);
							wp_send_json_error( $attachment_id->get_error_message() );
						} else {
							// The file was uploaded successfully!
							update_post_meta($_POST['post_id'], 'movie_attachment_id', $attachment_id);
							$this->movie_received_email($_POST['post_id']);
							wp_send_json_success($oscar_minc_options['oscar_minc_movie_uploaded_message']);
						}
					} else {
						error_log('O tamanho do arquivo excede o limite definido para a inscrição: ' . $_POST['post_id'], 0);
						wp_send_json_error( 'O tamanho do arquivo excede o limite de '. $oscar_minc_options['oscar_movie_max_size'] .'Gb.' );
					}
				} else {
					error_log('A inscrição : ' . $_POST['post_id'] . ' tentou enviar o vídeo com um formato inválido', 0);
					wp_send_json_error( 'Formato de arquivo inválido.' );
                }

				die;
            } else {
				error_log('Houve um problema no servidor ao enviar o vídeo com inscrição: ' . $_POST['post_id'], 0);
				die;
            }
        }

        public function decode_chunk( $data ) {
            $data = explode( ';base64,', $data );
            if ( ! is_array( $data ) || ! isset( $data[1] ) ) {
                return false;
            }
            $data = base64_decode( $data[1] );
            if ( ! $data ) {
                return false;
            }
            return $data;
        }


		/**
         * Add's a field for store CNPJ data
         *
		 * @param $user
		 */
		public function oscar_user_cnpj_field( $user )
		{
			if( !current_user_can( 'manage_options' ) && !current_user_can( 'editor' )  ){
				return;
			}
			?>
			<h3>Informações complementares</h3>

			<table class="form-table">
				<tr>
					<th>Empresa produtora</th>
					<td>
						<label for="user_company">
							<input name="user_company" type="text" id="user_company" value="<?php echo get_user_meta( $user->ID, '_user_company', true ); ?>">
						</label>
					</td>
				</tr>
                <tr>
                    <th>CNPJ</th>
                    <td>
                        <label for="user_cnpj">
                            <input name="user_cnpj" type="text" id="user_cnpj" value="<?php echo $this->mask(get_user_meta( $user->ID, '_user_cnpj', true ), '##.###.###/####-##'); ?>">
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>Telefone</th>
                    <td>
                        <label for="user_phone">
                            <input name="user_phone" type="text" id="user_phone" value="<?php echo get_user_meta( $user->ID, '_user_phone', true ); ?>">
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>Distribuidora nos EUA (se houver)</th>
                    <td>
                        <label for="user_distributor">
                            <input name="user_distributor" type="text" id="user_distributor" value="<?php echo get_user_meta( $user->ID, '_user_distributor', true ); ?>">
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>Endereço</th>
                    <td>
                        <label for="user_address">
                            <input name="user_address" type="text" id="user_address" value="<?php echo get_user_meta( $user->ID, '_user_address', true ); ?>">
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>Estado</th>
                    <td>
                        <label for="user_state">
                        <?php $state = get_user_meta( $user->ID, '_user_state', true ); ?>
                        <select id="user_state" class="form-control" name="user_state">
                            <option value="">Selecione</option>
                            <option <?php echo ( $state === 'Acre (AC)' ) ? 'selected="selected"' : ''; ?> value="Acre (AC)">Acre (AC)</option>
                            <option <?php echo ( $state === 'Alagoas (AL)' ) ? 'selected="selected"' : ''; ?> value="Alagoas (AL)">Alagoas (AL)</option>
                            <option <?php echo ( $state === 'Amapá (AP)' ) ? 'selected="selected"' : ''; ?> value="Amapá (AP)">Amapá (AP)</option>
                            <option <?php echo ( $state === 'Amazonas (AM)' ) ? 'selected="selected"' : ''; ?> value="Amazonas (AM)">Amazonas (AM)</option>
                            <option <?php echo ( $state === 'Bahia (BA)' ) ? 'selected="selected"' : ''; ?> value="Bahia (BA)">Bahia (BA)</option>
                            <option <?php echo ( $state === 'Ceará (CE)' ) ? 'selected="selected"' : ''; ?> value="Ceará (CE)">Ceará (CE)</option>
                            <option <?php echo ( $state === 'Distrito Federal (DF)' ) ? 'selected="selected"' : ''; ?> value="Distrito Federal (DF)">Distrito Federal (DF)</option>
                            <option <?php echo ( $state === 'Espírito Santo (ES)' ) ? 'selected="selected"' : ''; ?> value="Espírito Santo (ES)">Espírito Santo (ES)</option>
                            <option <?php echo ( $state === 'Goiás (GO)' ) ? 'selected="selected"' : ''; ?> value="Goiás (GO)">Goiás (GO)</option>
                            <option <?php echo ( $state === 'Maranhão (MA)' ) ? 'selected="selected"' : ''; ?> value="Maranhão (MA)">Maranhão (MA)</option>
                            <option <?php echo ( $state === 'Mato Grosso (MT)' ) ? 'selected="selected"' : ''; ?> value="Mato Grosso (MT)">Mato Grosso (MT)</option>
                            <option <?php echo ( $state === 'Mato Grosso do Sul (MS)' ) ? 'selected="selected"' : ''; ?> value="Mato Grosso do Sul (MS)">Mato Grosso do Sul (MS)</option>
                            <option <?php echo ( $state === 'Minas Gerais (MG)' ) ? 'selected="selected"' : ''; ?> value="Minas Gerais (MG)">Minas Gerais (MG)</option>
                            <option <?php echo ( $state === 'Pará (PA)' ) ? 'selected="selected"' : ''; ?> value="Pará (PA)">Pará (PA)</option>
                            <option <?php echo ( $state === 'Paraíba (PB)' ) ? 'selected="selected"' : ''; ?> value="Paraíba (PB)">Paraíba (PB)</option>
                            <option <?php echo ( $state === 'Paraná (PR)' ) ? 'selected="selected"' : ''; ?> value="Paraná (PR)">Paraná (PR)</option>
                            <option <?php echo ( $state === 'Pernambuco (PE)' ) ? 'selected="selected"' : ''; ?> value="Pernambuco (PE)">Pernambuco (PE)</option>
                            <option <?php echo ( $state === 'Piauí (PI)' ) ? 'selected="selected"' : ''; ?> value="Piauí (PI)">Piauí (PI)</option>
                            <option <?php echo ( $state === 'Rio de Janeiro (RJ)' ) ? 'selected="selected"' : ''; ?> value="Rio de Janeiro (RJ)">Rio de Janeiro (RJ)</option>
                            <option <?php echo ( $state === 'Rio Grande do Norte (RN)' ) ? 'selected="selected"' : ''; ?> value="Rio Grande do Norte (RN)">Rio Grande do Norte (RN)</option>
                            <option <?php echo ( $state === 'Rio Grande do Sul (RS)' ) ? 'selected="selected"' : ''; ?> value="Rio Grande do Sul (RS)">Rio Grande do Sul (RS)</option>
                            <option <?php echo ( $state === 'Rondônia (RO)' ) ? 'selected="selected"' : ''; ?> value="Rondônia (RO)">Rondônia (RO)</option>
                            <option <?php echo ( $state === 'Roraima (RR)' ) ? 'selected="selected"' : ''; ?> value="Roraima (RR)">Roraima (RR)</option>
                            <option <?php echo ( $state === 'Santa Catarina (SC)' ) ? 'selected="selected"' : ''; ?> value="Santa Catarina (SC)">Santa Catarina (SC)</option>
                            <option <?php echo ( $state === 'São Paulo (SP)' ) ? 'selected="selected"' : ''; ?> value="São Paulo (SP)">São Paulo (SP)</option>
                            <option <?php echo ( $state === 'Sergipe (SE)' ) ? 'selected="selected"' : ''; ?> value="Sergipe (SE)">Sergipe (SE)</option>
                            <option <?php echo ( $state === 'Tocantins (TO)' ) ? 'selected="selected"' : ''; ?> value="Tocantins (TO)">Tocantins (TO)</option>
                        </select>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>Cidade</th>
                    <td>
                        <label for="user_city">
                            <input name="user_city" type="text" id="user_city" value="<?php echo get_user_meta( $user->ID, '_user_city', true ); ?>">
                        </label>
                    </td>
                </tr>
                <tr>
                    <th>CEP</th>
                    <td>
                        <label for="user_zipcode">
                            <input name="user_zipcode" type="text" id="user_zipcode" value="<?php echo get_user_meta( $user->ID, '_user_zipcode', true ); ?>">
                        </label>
                    </td>
                </tr>
			</table>
		<?php }

		/**
         * Validate and store CNPJ data for users
         *
		 * @param $user_id
		 * @return bool
		 */
		public function update_user_cnpj( $user_id )
		{
			if ( !current_user_can( 'edit_user', $user_id ) ) {
				return false;
			} else {
				if( isset($_POST['user_cnpj']) ){
				    $raw_cnpj = str_replace('.', '', str_replace('-', '', str_replace('/', '', $_POST['user_cnpj'])));
					if (strlen($raw_cnpj) !== 14) {
						return false;
					}
					update_user_meta( $user_id, '_user_cnpj', $raw_cnpj);
				}
			}
		}

		/**
         * Mask for number inputs
         *
         * Example of usage:
         *  mask($cnpj,'##.###.###/####-##');   // 11.222.333/0001-99
         *  mask($cpf,'###.###.###-##');        // 001.002.003-00
         *  mask($cep,'#####-###');             // 08665-110
         *  mask($data,'##/##/####');           // 10/10/2010
         *
		 * @param $val
		 * @param $mask
		 * @return string
		 */
		public function mask ($val, $mask)
		{
			$maskared = '';
			$k = 0;
			for ($i = 0; $i <= strlen($mask) - 1; $i++) {
				if ($mask[$i] == '#') {
					if (isset($val[$k]))
						$maskared .= $val[$k++];
				} else {
					if (isset($mask[$i]))
						$maskared .= $mask[$i];
				}
			}
			return $maskared;
		}

		/**
         * Send a notification to user when the movie has been received successfully
         *
		 * @param $post_id
		 */
		public function movie_received_email( $post_id )
        {
			$user = wp_get_current_user();
			$oscar_minc_options = get_option('oscar_minc_options');
			$to = $user->user_email;
			$headers[] = 'From: ' . get_bloginfo('name') . ' <automatico@cultura.gov.br>';
			$headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
			$subject = 'Seu filme ' . get_post_meta($post_id, 'titulo_do_filme', true) . ', foi recebido com sucesso.';

			$body = $this->get_email_template('user', $oscar_minc_options['oscar_minc_email_body_video_received']);

			if (!wp_mail($to, $subject, $body, $headers)) {
				error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
			}

			$oscar_minc_options = get_option('oscar_minc_options');
			$monitoring_emails = explode(',', $oscar_minc_options['oscar_minc_monitoring_emails']);
			$to = array_map('trim', $monitoring_emails);
			$subject = 'O filme ' . get_post_meta($post_id, 'titulo_do_filme', true) . ', foi enviado com sucesso.';

			$msg = 'O proponente: <b>' . $user->display_name . '</b>, enviou o filme: <b>' . get_field('titulo_do_filme', $post_id) . '</b>';
			$msg .= '<br>Para visualiza-la, clique <a href="' . admin_url('post.php?post=' . $post_id . '&action=edit') . '" style="color: rgb(206, 188, 114); text-decoration: none">aqui</a>.';
			$body = $this->get_email_template('admin', $msg);

			if (!wp_mail($to, $subject, $body, $headers)) {
				error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
			}
        }

		/**
		 * Redirect users to auth page on specific pages
         *
		 */
        public function redirect_to_auth()
        {
			date_default_timezone_set('America/Sao_Paulo');
			$options = get_option( 'oscar_minc_options' );
			$now = new DateTime();
			$deadline = new DateTime( trim( $options['oscar_minc_deadline_time'] ) );
			$cur_user_is_admin_or_editor = ( current_user_can( 'editor' ) || current_user_can( 'administrator' ) ) ? true : false;
			
			if( $now > $deadline && !$cur_user_is_admin_or_editor ){
				if (
                    is_user_logged_in() && is_page('minhas-inscricoes') ||
                    is_user_logged_in() && is_page('enviar-filme') ||
                    is_user_logged_in() && is_page('inscricao')
                ) {
					wp_redirect( home_url('/inscricoes-encerradas') );
					exit;
				}
            }

			if (
				!is_user_logged_in() && is_page('minhas-inscricoes') ||
				!is_user_logged_in() && is_page('enviar-filme') ||
				!is_user_logged_in() && is_page('perfil') ||
				!is_user_logged_in() && is_page('inscricao')
			) {
				wp_redirect( home_url('/login') );
				exit;
			}

			if (is_user_logged_in() && is_page('login')  ) {
				wp_redirect( home_url('/cadastro') );
				exit;
			}

			if (is_user_logged_in() && is_page('cadastro')  ) {
				wp_redirect( home_url('/perfil') );
				exit;
			}
		}

		/**
		 * Redirect user after successful login, based on it's role
		 *
		 */
        public function oscar_login_redirect( $redirect_to, $request, $user )
        {
			if ( isset( $user->roles ) && is_array( $user->roles ) ) :
				if ( in_array( 'administrator', $user->roles ) ) {
					return admin_url();
				} elseif ( in_array( 'editor', $user->roles ) ) {
					return admin_url('edit.php?post_type=inscricao');
				} elseif ( in_array( 'committee', $user->roles ) ) {
					return admin_url('edit.php?post_type=inscricao&all_posts=1');
				} else {
					return home_url('/minhas-inscricoes');
				}
			else:
				return $redirect_to;
			endif;
        }

		/**
		 * Disable Admin Bar for All Users Except for Administrators
		 *
		 */
		public function remove_admin_bar()
        {
			if (
                !current_user_can('administrator') &&
                !current_user_can('editor') &&
                !is_admin()
            ) {
				show_admin_bar(false);
			}
        }

		/**
		 * Send an email for monitors, with detailed error data on submitting video
         *
		 */
        public function error_on_upload_oscar_video ()
        {
			if (isset($_POST) and $_SERVER['REQUEST_METHOD'] == "POST") {

				date_default_timezone_set('America/Sao_Paulo');
				$user = wp_get_current_user();
				$user_cnpj = get_user_meta( $user->ID, '_user_cnpj', true );
				$user_cnpj = $this->mask($user_cnpj, '##.###.###/####-##');

				$oscar_minc_options = get_option('oscar_minc_options');
				$monitoring_emails = explode(',', $oscar_minc_options['oscar_minc_monitoring_emails']);
				$to = array_map('trim', $monitoring_emails);
				$headers[] = 'From: ' . get_bloginfo('name') . ' <automatico@cultura.gov.br>';
				$headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
				$subject = 'Erro ao enviar um filme';

				$body = '<h1>Olá,</h1>';
				$body .= '<p>O proponente: <b>' . $user->display_name . '</b> (CNPJ: <b>' . $user_cnpj . '</b>), não conseguiu enviar o filme devido à um erro interno às '. date('d/m/Y - H:i:s') .'</p>';
				$body .= '<p>Dados sobre o arquivo:</p>';
				$body .= '<ul>';
				$body .= '<li>Nome: <b>'. $_POST['movie_name'] .'</b></li>';
				$body .= '<li>Tamanho: <b>'. $this->format_bytes( $_POST['movie_size'] ) .'</b></li>';
				$body .= '<li>Tipo: <b>'. $_POST['movie_type'] .'</b></li>';
				$body .= '</ul>';
				$body .= '<p>Informações sobre o navegador utilizado (Sistema operacional: '. $_POST['so'] .'):</p>';
				$body .= '<ul>';
				$body .= '<li>Código: <b>'. $_POST['browser_codename'] .'</b></li>';
				$body .= '<li>Nome: <b>'. $_POST['browser_name'] .'</b></li>';
				$body .= '<li>Versão: <b>'. $_POST['browser_version'] .'</b></li>';
				$body .= '</ul>';
				$body .= '<br><br><p><small>Você recebeu este email pois está cadastrado para monitorar as inscrições ao Oscar. Para deixar de monitorar, remova seu email das configurações, em: <a href="' . admin_url('edit.php?post_type=inscricao&page=inscricao-options-page') . '">Configurações Oscar</a></small><p>';

				if (!wp_mail($to, $subject, $body, $headers)) {
					error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
				}

				wp_send_json_success();
				exit;
            }
        }


		/**
         * Converts bytes into human readable file size.
		 *
         * @author Mogilev Arseny
         * @link http://php.net/manual/de/function.filesize.php
		 * @param $bytes
		 * @return float|int|string
		 */
        public function format_bytes($bytes) {
			$bytes = floatval($bytes);
			$arBytes = array(
				0 => array(
					"UNIT" => "TB",
					"VALUE" => pow(1024, 4)
				),
				1 => array(
					"UNIT" => "GB",
					"VALUE" => pow(1024, 3)
				),
				2 => array(
					"UNIT" => "MB",
					"VALUE" => pow(1024, 2)
				),
				3 => array(
					"UNIT" => "KB",
					"VALUE" => 1024
				),
				4 => array(
					"UNIT" => "B",
					"VALUE" => 1
				),
			);

			foreach($arBytes as $arItem)
			{
				if($bytes >= $arItem["VALUE"])
				{
					$result = $bytes / $arItem["VALUE"];
					$result = str_replace(".", "," , strval(round($result, 2)))." ".$arItem["UNIT"];
					break;
				}
			}
			return $result;
		}

		public function support_message ()
		{
			if (isset($_POST) and $_SERVER['REQUEST_METHOD'] == "POST") {
				$user = wp_get_current_user();
				$user_cnpj = get_user_meta( $user->ID, '_user_cnpj', true );
				$user_cnpj = $this->mask($user_cnpj, '##.###.###/####-##');

				$oscar_minc_options = get_option('oscar_minc_options');
				$monitoring_emails = explode(',', $oscar_minc_options['oscar_minc_monitoring_emails']);
				$to = array_map('trim', $monitoring_emails);
				$headers[] = 'From: ' . get_bloginfo('name') . ' <automatico@cultura.gov.br>';
				$headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
				$subject = 'Solicitação de suporte para a inscrição';

				$body = '<h1>Olá,</h1>';
				$body .= '<p>O proponente: <b>' . $user->display_name . '</b> (CNPJ: <b>' . $user_cnpj . '</b>), solicitou suporte para: <b>'. get_the_title($_POST['post_id']) .'</b>.</p>';
				$body .= '<p>Mensagem recebida:</p>';
				$body .= '<ul>';
				$body .= '<li>Motivo do suporte: <b>'. $_POST['support_reason'] .'</b></li>';
				$body .= '<li>Mensagem: <b>'. $_POST['support_message'] .'</b></li>';
				$body .= '</ul>';
				$body .= '<p>O email do proponente para resposta é: <b>' . $user->user_email . '</b>, acesse os dados de sua inscrição <a href="' . admin_url('post.php?post='. $_POST['post_id'] .'&action=edit') . '">aqui</a>.</p>';
				$body .= '<br><br><p><small>Você recebeu este email pois está cadastrado para monitorar as inscrições ao Oscar. Para deixar de monitorar, remova seu email das configurações, em: <a href="' . admin_url('edit.php?post_type=inscricao&page=inscricao-options-page') . '">Configurações Oscar</a></small><p>';

				if (!wp_mail($to, $subject, $body, $headers)) {
					error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
					wp_send_json_error('Ocorreu um erro ao tentar enviar sua mensagem, por favor tente novamente mais tarde.');
				}

				wp_send_json_success('Sua mensagem foi enviada com sucesso e será analisada por nossa equipe.');
				exit;
			}
		}

		/**
         * This redirects the failed login to the custom login page instead of default login page with a modified url
         *
		 * @param $username
		 */
		public function front_end_login_fail( $username ) {
		    setcookie('log', $username);
			$page_login = get_page_by_title( 'login' );

			// Getting URL of the login page
			$referrer = $_SERVER['HTTP_REFERER'];
			// if there's a valid referrer, and it's not the default log-in screen
			if( !empty( $referrer ) && !strstr( $referrer,'wp-login' ) && !strstr( $referrer,'wp-admin' ) ) {
				// wp_redirect( get_permalink( $page_login->ID ) . "?login=failed" );
				wp_redirect( add_query_arg('login', 'failed', get_permalink( $page_login->ID )) );
				exit;
			}

		}

		/**
         * Add the 'Lost Password?' link to wp_login_form() output
         *
		 * @return string
		 */
	    public function add_lost_password_link() {
			return '<a href="'. wp_lostpassword_url( home_url() ) .'" class="forget-password-link" title="Esqueceu a senha?">Esqueceu a senha?</a>';
		}

		/**
		 * Redirects the user to the custom "Forgot your password?" page instead of
		 * wp-login.php?action=lostpassword.
         *
		 * @link https://code.tutsplus.com/tutorials/build-a-custom-wordpress-user-flow-part-3-password-reset--cms-23811
		 */
		public function redirect_to_custom_lostpassword() {
			if ( 'GET' == $_SERVER['REQUEST_METHOD'] ) {
				if ( is_user_logged_in() ) {
					$this->redirect_logged_in_user();
					exit;
				}

				wp_redirect( home_url( '/recuperar-senha' ) );
				exit;
			}
		}

		/**
		 * Initiates password reset.
         *
		 * @link https://code.tutsplus.com/tutorials/build-a-custom-wordpress-user-flow-part-3-password-reset--cms-23811
		 */
		public function do_password_lost() {
			if ( 'POST' == $_SERVER['REQUEST_METHOD'] ) {
				$errors = retrieve_password();
				if ( is_wp_error( $errors ) ) {
					// Errors found
					$redirect_url = home_url( '/recuperar-senha' );
					$redirect_url = add_query_arg( 'errors', join( ',', $errors->get_error_codes() ), $redirect_url );
				} else {
					// Email sent
					$redirect_url = home_url( '/login' );
					$redirect_url = add_query_arg( 'checkemail', 'confirm', $redirect_url );
				}

				wp_redirect( $redirect_url );
				exit;
			}
		}

		/**
		 * Returns the message body for the password reset mail.
		 * Called through the retrieve_password_message filter.
		 *
         * @link https://code.tutsplus.com/tutorials/build-a-custom-wordpress-user-flow-part-3-password-reset--cms-23811
		 * @param string  $message    Default mail message.
		 * @param string  $key        The activation key.
		 * @param string  $user_login The username for the user.
		 * @param WP_User $user_data  WP_User object.
		 *
		 * @return string   The mail message to send.
		 */
		public function replace_retrieve_password_message( $message, $key, $user_login, $user_data ) {
			$msg  = '<h1>Olá,</h1>';
			$msg .= '<p>Alguém solicitou a alteração de senha para a seguinte conta: <b>' . $user_login . '</b></p>';
			$msg .= '<p>Se isso foi um erro, apenas ignore este e-mail e nada acontecerá. Para redefinir sua senha, visite o seguinte endereço:</p>';
			$msg .= site_url( "wp-login.php?action=rp&key=$key&login=" . rawurlencode( $user_login ), 'login' );
			$msg .= '<br><br><p><b>Obrigado!</b></p>';

			return $msg;
		}

		/**
		 * Filter applied to the url returned on logout action
		 *
		 * @return string|void
		 */
        public function logout_without_confirmation($action, $result)
        {
			if ($action == "log-out" && !isset($_GET['_wpnonce'])) {
				$redirect_to = isset($_REQUEST['redirect_to']) ? $_REQUEST['redirect_to'] : home_url();
				$location = str_replace('&amp;', '&', wp_logout_url($redirect_to));
				header("Location: $location");
				die;
			}
        }


		/**
		 * Custom role to handle committee
         *
		 */
        public function add_committee_role ()
        {
			$capabilities = array(
				'read' => true,
				'edit_posts' => true
			);

			// This is for development only
			remove_role( 'committee' );

			add_role( 'committee', 'Comissão', $capabilities );
        }

		/**
		 * Remove some items from specific roles from main menu
		 *
		 */
        public function remove_menus_based_on_roles ()
        {
			$current_user = wp_get_current_user();
			if( $current_user->roles[0] === 'committee' ){
				remove_menu_page( 'index.php' );
				remove_menu_page( 'edit.php' );
				remove_menu_page( 'tools.php' );
				remove_menu_page( 'edit.php?post_type=project' );
				remove_menu_page( 'wpcf7' );
				remove_menu_page( 'jetpack' );
            }
		}

		/**
		 * Modify some items from specific roles from menu
		 *
		 */
		public function modify_menu_based_on_roles ()
        {
			global $submenu;
			$current_user = wp_get_current_user();
			if( $current_user->roles[0] === 'committee' ){
				// Remove 'add new' submenu
				unset($submenu['edit.php?post_type=inscricao'][10]);
				$submenu['edit.php?post_type=inscricao'][5][2] = $submenu['edit.php?post_type=inscricao'][5][2] . '&all_posts=1';
            }
        }

		/**
		 * Remove some items from specific roles from toolbar
         *
		 */
        public function remove_toolbar_node_based_on_roles ()
        {
			global $wp_admin_bar;
			$current_user = wp_get_current_user();
			if( $current_user->roles[0] === 'committee' ){
				$wp_admin_bar->remove_node('wp-logo');
				$wp_admin_bar->remove_node('comments');
				$wp_admin_bar->remove_node('new-content');
			}
        }

		/**
         * Add some styles to specific roles
		 *
		 */
        public function admin_oscar_roles_style ()
        {
			global $wp_admin_bar;
			$current_user = wp_get_current_user();
			if( $current_user->roles[0] === 'committee' ){ ?>
                <style type="text/css">
                    #wpbody-content .wrap .wp-heading-inline + a,
                    #wpbody-content .wrap .subsubsub,
                    #posts-filter .tablenav,
                    .movie-status,
                    tr.user-rich-editing-wrap,
                    tr.user-admin-color-wrap,
                    tr.user-comment-shortcuts-wrap,
                    tr.show-admin-bar,
                    tr.user-language-wrap,
                    tr.user-description-wrap,
                    tr.user-profile-picture,
                    tr.user-sessions-wrap,
                    tr.user-nickname-wrap,
                    tr.user-display-name-wrap,
                    tr.user-url-wrap,
                    #post-by-email,
                    #your-profile .form-table + .form-table,
                    #wpbody-content .wrap h2{
                        display: none !important;
                    }
                    #posts-filter .search-box{
                        margin-bottom: 15px;
                    }
                </style>
			<?php }
        }

		/**
         * Download attachment file
         *
		 * @param $movie_id
		 */
        private function download_movie_attachment ( $movie_id )
        {
			$file = get_attached_file( $movie_id );
			if(file_exists($file)) {
				header('Content-Description: File Transfer');
				header('Content-Type: application/octet-stream');
				header('Content-Disposition: attachment; filename='.basename($file));
				header('Content-Transfer-Encoding: binary');
				header('Expires: 0');
				header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
				header('Pragma: public');
				header('Content-Length: ' . filesize($file));
				ob_clean();
				flush();
				ob_end_flush();
				readfile($file);
				exit;
			} else {
			    wp_die('Ocorreu um problema ao tentar realizar o download do filme. <a href="'. admin_url('edit.php?post_type=inscricao') .'">Voltar para a lista de inscrições.</a>');
            }
        }

		/**
		 * Show only subscriptions marked as 'enabled' to committee
		 *
		 */
		public function filter_posts_list( $query ) {
			global $current_screen;
			$user = wp_get_current_user();
			$user_role = $user->roles[0];

			if ( $user_role !== 'committee' ) {
				return;
			}

			if ( is_admin() && $query->is_main_query() && $current_screen->id === 'edit-inscricao' ) {
			    // Show only movies enabled to committee
				$query->set( 'meta_key', 'movie_enabled_to_comission' );
				$query->set( 'meta_value', 1 );
			}
		}

		/**
         * Add's a menu item, based on user role
         *
		 * @param $items
		 * @param $args
		 * @return string
		 */
		public function add_menu_item ($items, $args)
        {
			$user = wp_get_current_user();
			$user_role = $user->roles[0];

			if( $args->theme_location == 'service-menu' ) :
				$items .= '<li class="menu-item menu-item-object-page menu-item-has-children dropdown committee-link">';

			    if ( is_user_logged_in() ) :
					$items .= '<a title="Acesso" href="#" data-toggle="dropdown" class="dropdown-toggle" aria-haspopup="true">Acesso <span class="caret"></span></a>';
					$items .= '<ul role="menu" class=" dropdown-menu">';
					if( $user_role === 'committee' ) {
						$items .= '<li itemscope="itemscope" itemtype="https://www.schema.org/SiteNavigationElement" class="menu-item"><a title="Filmes inscritos" href="'. admin_url('edit.php?post_type=inscricao&all_posts=1') .'" class="nav-link">Filmes inscritos</a></li>';
                    } else {
						$items .= '<li itemscope="itemscope" itemtype="https://www.schema.org/SiteNavigationElement" class="menu-item"><a title="Minhas inscrições" href="'. home_url('/minhas-inscricoes') .'" class="nav-link">Minhas inscrições</a></li>';
                    }
					$items .= '<li itemscope="itemscope" itemtype="https://www.schema.org/SiteNavigationElement" class="menu-item"><a title="Perfil" href="'. home_url('/perfil') .'" class="nav-link">Perfil</a></li>';
					$items .= '<li itemscope="itemscope" itemtype="https://www.schema.org/SiteNavigationElement" class="menu-item"><a title="Sair" href="'. wp_logout_url( home_url() ) .'" class="nav-link">Sair</a></li>';
					$items .= '</ul>';
                else :
					$items .= '<a itemscope="itemscope" itemtype="https://www.schema.org/SiteNavigationElement" title="Entrar" href="'. home_url('login') .'">Entrar</a>';
                endif;

				$items .= '</li>';
			endif;
			return $items;
        }

        public function get_email_template($user_type = 'user', $message)
        {
			$user = wp_get_current_user();
			ob_start();
			if( $user_type === 'user' ){
				require dirname( __FILE__ ) . '/email-templates/user-template.php';
            } else {
				require dirname( __FILE__ ) . '/email-templates/admin-template.php';
            }
			return ob_get_clean();
        }

		/**
         * Debugging wp mail like a boss debugger
         *
		 * @link https://www.codeforest.net/debugging-wp-mail-like-a-boss-debugger
		 * @param $wp_error
		 * @return bool]
		 */
		public function action_wp_mail_failed($wp_error)
		{
			return error_log(print_r($wp_error, true));
		}

        /**
         * Send an email for monitors, when user start submitting his video
         *
         */
        public function upload_start_oscar_video ()
        {
            if (isset($_POST) and $_SERVER['REQUEST_METHOD'] == "POST") {

                date_default_timezone_set('America/Sao_Paulo');
                $user = wp_get_current_user();
                $user_cnpj = get_user_meta( $user->ID, '_user_cnpj', true );
                $user_cnpj = $this->mask($user_cnpj, '##.###.###/####-##');

                $oscar_minc_options = get_option('oscar_minc_options');
                $monitoring_emails = explode(',', $oscar_minc_options['oscar_minc_monitoring_emails']);
                $to = array_map('trim', $monitoring_emails);
                $headers[] = 'From: ' . get_bloginfo('name') . ' <automatico@cultura.gov.br>';
                $headers[] = 'Reply-To: ' . $oscar_minc_options['oscar_minc_email_from_name'] . ' <' . $oscar_minc_options['oscar_minc_email_from'] . '>';
                $subject = 'Um filme começou a ser enviado';

                $body = '<h1>Olá,</h1>';
                $body .= '<p>O proponente: <b>' . $user->display_name . '</b> (CNPJ: <b>' . $user_cnpj . '</b>), começou o processo de envio do seu filme às '. date('d/m/Y - H:i:s') .'</p>';
                $body .= '<p>Dados sobre o arquivo enviado:</p>';
                $body .= '<ul>';
                $body .= '<li>Nome: <b>'. $_POST['movie_name'] .'</b></li>';
                $body .= '<li>Tamanho: <b>'. $this->format_bytes( $_POST['movie_size'] ) .'</b></li>';
                $body .= '<li>Tipo: <b>'. $_POST['movie_type'] .'</b></li>';
                $body .= '</ul>';
                $body .= '<br><br><p><small>Você recebeu este email pois está cadastrado para monitorar as inscrições ao Oscar. Para deixar de monitorar, remova seu email das configurações, em: <a href="' . admin_url('edit.php?post_type=inscricao&page=inscricao-options-page') . '">Configurações Oscar</a></small><p>';

                if (!wp_mail($to, $subject, $body, $headers)) {
                    error_log("ERRO: O envio de email de monitoramento para: " . $to . ', Falhou!', 0);
                }

                wp_send_json_success();
                exit;
            }
        }

        /**
         * Let Editors manage users, and run this only once.
         *
         * @link https://isabelcastillo.com/editor-role-manage-users-wordpress
         */
        function oscar_editor_manage_users() {

            if ( get_option( 'oscar_add_cap_editor_once' ) != 'done' ) {

                // let editor manage users
                $edit_editor = get_role('editor');
                $edit_editor->add_cap('edit_users');
                $edit_editor->add_cap('list_users');
                $edit_editor->add_cap('promote_users');
                $edit_editor->add_cap('create_users');
                $edit_editor->add_cap('add_users');
                $edit_editor->add_cap('delete_users');

                update_option( 'oscar_add_cap_editor_once', 'done' );
            }

        }
	}

    // Initialize our plugin
    $oscar_minc = new OscarMinC();

endif;
