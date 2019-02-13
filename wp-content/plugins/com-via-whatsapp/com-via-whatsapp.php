<?php
/*
Plugin Name: Formulário - Comunicados via WhatsApp
Plugin URI: https://github.com/Darciro/Piwik-WordPress
Description: Cadastro para recebimento de informações, comunicados e notícias da Secretaria Especial da Cultura via Whats App
Version: 1.0
Author: Ricardo Carvalho
Author URI: https://galdar.com.br
License: GNU GPLv3
*/

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

if ( ! class_exists( 'comViaWhatsApp' ) ) :

	class comViaWhatsApp {

		public function __construct() {
			register_activation_hook( __FILE__, array( $this, 'com_via_whatsapp_db' ) );
			add_shortcode( 'com-via-whatsapp-form', array( $this, 'com_via_whatsapp_shortcode' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'register_scripts' ) );
			add_action( 'admin_enqueue_scripts', array( $this, 'register_admin_scripts' ) );
			add_action( 'admin_menu', array( $this, 'com_via_whatsapp_add_admin_page' ) );
		}

		/**
		 * Create the database to store users information
		 *
		 */
		public function com_via_whatsapp_db() {
			global $wpdb;
			$charset_collate = $wpdb->get_charset_collate();
			$table_name      = $wpdb->prefix . 'com_via_whatsapp';

			if ( $wpdb->get_var( "show tables like '$table_name'" ) != $table_name ) {
				$sql = "CREATE TABLE $table_name (
				ID bigint(20) NOT NULL AUTO_INCREMENT,
				user_registered datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
				user_email varchar(100) NOT NULL,
				user_fullname varchar(250) NOT NULL,
				user_phone varchar(100) NOT NULL,
				user_profession varchar(250) NOT NULL,
				user_areas_of_interest longtext NOT NULL,
				user_is_government_employee bool,
				UNIQUE KEY ID (ID)
			) $charset_collate;";
				require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
				dbDelta( $sql );
			}
		}

		/**
		 * Shortcode to render form
		 *
		 * @return string
		 */
		public function com_via_whatsapp_shortcode() {

			ob_start(); ?>

			<form id="com-via-whatsapp-form" action="<?php the_permalink(); ?>" method="post">
				<div class="messages-wrapper">
					<?php
						if ( isset( $_POST['register_com_via_whatsapp_form'] ) ) :
							if ( ! isset( $_POST['com_via_whatsapp_nonce'] ) || ! wp_verify_nonce( $_POST['com_via_whatsapp_nonce'], 'register_com_via_whatsapp' ) ) : ?>

								<div class="alert alert-warning" role="alert">
									<strong>Ocorreu um erro ao realizar o cadastro, por favor, tente novamente!</strong>
								</div>

							<?php else :
								$this->register();
							endif;
						endif;
					?>
				</div>

				<div class="row">
					<div class="col-6">
						<div class="form-group">
							<label for="user_fullname">Nome completo</label>
							<input type="text" class="form-control" id="user_fullname" name="user_fullname" value="<?php echo isset( $_POST['user_fullname'] ) ? $_POST['user_fullname'] : ''; ?>" required />
						</div>
					</div>
					<div class="col-6">
						<div class="form-group">
							<label for="user_email">E-mail</label>
							<input type="email" class="form-control" id="user_email" name="user_email" value="<?php echo isset( $_POST['user_email'] ) ? $_POST['user_email'] : ''; ?>" required>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-6">
						<div class="form-group">
							<label for="user_phone">Número de telefone</label>
							<input type="tel" class="form-control" id="user_phone" name="user_phone" value="<?php echo isset( $_POST['user_phone'] ) ? $_POST['user_phone'] : ''; ?>" minlength="14" maxlength="15" required>
						</div>
					</div>
					<div class="col-6">
						<div class="form-group">
							<label for="user_profession">Profissão</label>
							<input type="text" class="form-control" id="user_profession" name="user_profession" value="<?php echo isset( $_POST['user_profession'] ) ? $_POST['user_profession'] : ''; ?>" required>
						</div>
					</div>
				</div>
				<div class="form-group checkbox-area">

					<label class="areas-title">Área de interesse (selecione abaixo uma ou mais áreas de interesse)</label>

					<div class="checkbox-wrapper">

						<div class="checkbox-item select-all">
							<input id="check-all" type="checkbox" <?php echo in_array( 'Todos', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Todos" />
							<label for="check-all"><i class="icon-double-checkmark"></i> Selecionar Todos</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-audiovisual" type="checkbox" <?php echo in_array( 'Audiovisual', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Audiovisual" />
							<label for="checkbox-audiovisual"><span>Audiovisual</span></label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-museus" type="checkbox" <?php echo in_array( 'Museus', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Museus" />
							<label for="checkbox-museus">Museus</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-pontos-de-cultura" type="checkbox" <?php echo in_array( 'Pontos de Cultura', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Pontos de Cultura" />
							<label for="checkbox-pontos-de-cultura">Pontos de Cultura</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-editais" type="checkbox" <?php echo in_array( 'Editais', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Editais" />
							<label for="checkbox-editais">Editais</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-politica-cultural" type="checkbox" <?php echo in_array( 'Política cultural', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Política cultural" />
							<label for="checkbox-politica-cultural">Política cultural</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-Sistema Nacional de Cultura" type="checkbox" <?php echo in_array( 'Sistema Nacional de Cultura', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Sistema Nacional de Cultura" />
							<label for="checkbox-Sistema Nacional de Cultura">Sistema Nacional de Cultura</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-lei-rouanet" type="checkbox" <?php echo in_array( 'Lei Rouanet', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Lei Rouanet" />
							<label for="checkbox-lei-rouanet">Lei Rouanet</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-patrimonio" type="checkbox" <?php echo in_array( 'Patrimônio', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Patrimônio" />
							<label for="checkbox-patrimonio">Patrimônio</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-literatura-e-bibliotecas" type="checkbox" <?php echo in_array( 'Literatura e Bibliotecas', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Literatura e Bibliotecas" />
							<label for="checkbox-literatura-e-bibliotecas">Literatura e Bibliotecas</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-Cultura afro" type="checkbox" <?php echo in_array( 'Cultura afro', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Cultura afro" />
							<label for="checkbox-Cultura afro">Cultura afro</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-direitos-autorais" type="checkbox" <?php echo in_array( 'Direitos Autorais', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Direitos Autorais" />
							<label for="checkbox-direitos-autorais">Direitos Autorais</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-servicos" type="checkbox" <?php echo in_array( 'Serviços', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Serviços" />
							<label for="checkbox-servicos">Serviços</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-cultura-popular" type="checkbox" <?php echo in_array( 'Cultura Popular', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Cultura Popular" />
							<label for="checkbox-cultura-popular">Cultura Popular</label>
						</div>

						<div class="checkbox-item">
							<input id="checkbox-patrimonio-cultural" type="checkbox" <?php echo in_array( 'Patrimônio Cultural', $_POST['user_areas_of_interest'] ) ? 'checked' : ''; ?> name="user_areas_of_interest[]" value="Patrimônio Cultural" />
							<label for="checkbox-patrimonio-cultural">Patrimônio Cultural</label>
						</div>
					</div>
				</div>

				<input type="hidden" name="user_is_government_employee" value="<?php echo $_GET['uge'] ? '1' : ''; ?>">
				<input type="hidden" name="register_com_via_whatsapp_form" value="1">
				<?php wp_nonce_field( 'register_com_via_whatsapp', 'com_via_whatsapp_nonce' ); ?>

				<div class="submit-wrapper">
					<button class="btn btn-primary" id="submit-button" type="submit">Enviar</button>
				</div>
			</form>


			<?php return ob_get_clean();
		}

		/**
		 * Register the data sent from the form
		 *
		 */
		public function register() {

			if ( $this->validation() ) { ?>
				<div class="alert alert-danger">
					<p><strong>Por favor, corrija os erros abaixo e tente novamente:</strong></p>
					<ul>
						<?php foreach ( $this->validation()->get_error_messages() as $error_message ) {
							echo '<li>' . $error_message . '</li>';
						} ?>
					</ul>
				</div>
			<?php } else {

				$user_registered        = current_time( 'mysql', 0 );
				$user_email             = $_POST['user_email'];
				$user_fullname          = $_POST['user_fullname'];
				$user_phone             = $_POST['user_phone'];
				$user_profession        = $_POST['user_profession'];
				$user_areas_of_interest = maybe_serialize( $_POST['user_areas_of_interest'] );
				$user_is_government_employee = $_POST['user_is_government_employee'];

				global $wpdb;
				$table_name = $wpdb->prefix . 'com_via_whatsapp';
				$registered = $wpdb->insert( $table_name, array(
					'user_registered'        => $user_registered,
					'user_email'             => $user_email,
					'user_fullname'          => $user_fullname,
					'user_phone'             => $user_phone,
					'user_profession'        => $user_profession,
					'user_areas_of_interest' => $user_areas_of_interest,
					'user_is_government_employee' => $user_is_government_employee
				),
					array( '%s', '%s', '%s', '%s', '%s', '%s', '%s' ) // '%d', '%f', '%s' (integer, float, string)
				);

				if ( $registered ) : $_POST = array(); ?>
					<div class="alert alert-success">
						<strong>Cadastro realizado com sucesso</strong>
					</div>
				<?php else: ?>
					<div class="alert alert-danger">
						<strong>Houve um erro ao realizar seu cadastro, por favor, tente novamente</strong>
					</div>
				<?php endif;

			}

		}

		/**
		 * Validate required form fields
		 *
		 * @return bool|WP_Error
		 */
		public function validation() {
			$user_fullname          = $_POST['user_fullname'];
			$user_email             = $_POST['user_email'];
			$user_phone             = $_POST['user_phone'];
			$user_profession        = $_POST['user_profession'];
			$user_areas_of_interest = $_POST['user_areas_of_interest'];

			$errors = false;
			if ( empty( $user_fullname ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'user_fullname_empty', 'Por favor insira seu nome completo' );
			}

			if ( empty( $user_email ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'user_email_empty', 'Por favor insira seu email' );
			}

			if ( ! empty( $user_email ) && ! is_email( $user_email ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'email_invalid', 'O email parece ser inválido' );
			}

			if ( empty( $user_phone ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'user_phone_empty', 'Por favor insira seu telefone' );
			}

			if ( empty( $user_profession ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'user_profession_empty', 'Por favor insira sua profissão' );
			}

			if ( empty( $user_areas_of_interest ) ) {
				if ( ! is_wp_error( $errors ) ) {
					$errors = new WP_Error();
				}

				$errors->add( 'user_areas_of_interest_empty', 'Por favor, selecione ao menos uma área de interesse' );
			}


			if ( is_wp_error( $errors ) ) {
				return $errors;
			} else {
				return false;
			}

		}

		/**
		 * Register our frontend scripts
		 *
		 */
		public function register_scripts() {
			wp_enqueue_script( 'com-via-whatsapp-scripts', plugin_dir_url( __FILE__ ) . 'assets/com-via-whatsapp.js', array( 'jquery' ), false, true );
			wp_enqueue_script( 'jquery-mask', plugin_dir_url( __FILE__ ) . 'assets/jquery.mask.min.js', array( 'jquery' ), false, true );
			wp_enqueue_script( 'jquery-validate', plugin_dir_url( __FILE__ ) . 'assets/jquery.validate.min.js', array( 'jquery' ), false, true );
		}

		/**
		 * Register our dashboard scripts
		 *
		 */
		public function register_admin_scripts() {
			wp_enqueue_script( 'xlsx-core', plugin_dir_url( __FILE__ ) . 'assets/xlsx.core.min.js', array( 'jquery' ) );
			wp_enqueue_script( 'FileSaver', plugin_dir_url( __FILE__ ) . 'assets/FileSaver.min.js', array( 'jquery' ) );
			wp_enqueue_script( 'tableexport', plugin_dir_url( __FILE__ ) . 'assets/tableexport.js', array( 'jquery' ) );
			wp_enqueue_script( 'com-via-whatsapp-admin-scripts', plugin_dir_url( __FILE__ ) . 'assets/com-via-whatsapp-admin.js', array( 'jquery' ) );

			wp_register_style( 'com-via-whatsapp-admin-styles', plugins_url( '/assets/com-via-admin-whatsapp.css', __FILE__ ) );
			wp_enqueue_style( 'com-via-whatsapp-admin-styles' );
		}

		/**
		 * Create a admin page for showing the registers
		 *
		 */
		public function com_via_whatsapp_add_admin_page() {
			add_options_page( 'Comunicados via WhatsApp', 'Comunicados via WhatsApp', 'manage_options', 'com-via-whatsapp-admin-page', array( $this, 'com_via_whatsapp_admin_page' ) );
		}


		/**
		 * Render admin page
		 *
		 */
		public function com_via_whatsapp_admin_page() {
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
			} ?>

			<div class="wrap">
				<h1>Comunicados via WhatsApp</h1>
				<p>Lista de usuários cadastrados para receber comunicados via WhatsApp. Para exportar os dados selecione a opção abaixo.</p>

				<?php

				global $wpdb;
				$table_name = $wpdb->prefix . 'com_via_whatsapp';
				$data       = $wpdb->get_results( "SELECT * FROM $table_name" );

				?>

				<table id="com-via-whatsapp-table" class="widefat fixed" cellspacing="0">
					<thead>
					<tr>
						<th scope="col">Data de cadastro</th>
						<th scope="col">Nome completo</th>
						<th scope="col">Email</th>
						<th scope="col">Telefone</th>
						<th scope="col">Profissão</th>
						<th scope="col">Áreas de interesse</th>
						<th scope="col">Servidor público</th>
					</tr>
					</thead>
					<tbody>
					<?php
					if ( ! empty( $data ) ) :
						$i = 0;
						foreach ( $data as $d ) : ?>

							<tr class="<?php echo ( $i % 2 ) ? 'alternate' : '' ?>">
								<th scope="row"><?php echo mysql2date( 'd/m/Y - H:i', $d->user_registered ); ?></th>
								<td style="vertical-align: middle"><b><?php echo $d->user_fullname; ?></b></td>
								<td style="vertical-align: middle"><?php echo $d->user_email; ?></td>
								<td style="vertical-align: middle"><?php echo $d->user_phone; ?></td>
								<td style="vertical-align: middle"><?php echo $d->user_profession; ?></td>
								<?php $user_areas_of_interest = unserialize( $d->user_areas_of_interest ); ?>
								<td style="vertical-align: middle">
									<ul>
										<?php
										$a   = 0;
										$len = count( $user_areas_of_interest );
										foreach ( $user_areas_of_interest as $area ) : ?>
											<?php $sep = ( $a == $len - 1 ) ? ' ' : ', '; ?>
											<li><?php echo $area . $sep; ?><br></li>
											<?php $a ++; ?>
										<?php endforeach; ?>
									</ul>
								</td>
								<td style="vertical-align: middle"><?php echo $d->user_is_government_employee ? 'Sim' : 'Não'; ?></td>
							</tr>

							<?php $i ++; endforeach; ?>
					<?php else: ?>
						<tr class="alternate">
							<th scope="row" colspan="7">Nenhum cadastro foi realizado até o momento.</th>
						</tr>
					<?php endif; ?>
					</tbody>
				</table>

			</div>

			<?php
		}

	}

	// Instantiate our plugin
	$com_via_whatsapp = new comViaWhatsApp();
endif;