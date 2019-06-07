<?php

/**
 * Class Oscar_Minc_Shortcodes
 *
 */
class Oscar_Minc_Shortcodes
{
    public function __construct()
    {
        if( !is_admin() ){
			add_shortcode('oscar-minc', array($this, 'oscar_minc_subscription_form_shortcode'));
			add_shortcode('oscar-register', array($this, 'oscar_minc_auth_form'));
			add_shortcode('oscar-login', array($this, 'oscar_minc_login_form'));
			add_shortcode('oscar-subscriptions', array($this, 'oscar_minc_user_subscriptions'));
			add_shortcode('oscar-upload-video', array($this, 'oscar_minc_video_upload_form'));
			add_shortcode('oscar-password-lost-form', array($this, 'render_password_lost_form'));
        }
    }

    /**
     * Shortcode to show ACF form
     *
     * @param $atts
     * @return string
     */
    public function oscar_minc_subscription_form_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'form-group-id' => '',
            'return' => home_url('/?sent=true#message')
        ), $atts);

	    $author_id = get_post_field( 'post_author', $_GET['inscricao'] );
	    $current_user_id = get_current_user_id();

        ob_start();

	    if( !empty($_GET['inscricao']) && $author_id != $current_user_id ) {
		    echo '<p>Você não possui permissão para editar esta inscrição.</p>';
		    return ob_get_clean();
	    }

        if( get_post_meta( $_GET['inscricao'], 'movie_attachment_id', true ) ) :

            echo '<p>Sua inscrição está sendo analisada, não é possível editar os dados.</p>';

        else :

            $post_inscricao = empty($_GET['inscricao']) ? 'new_inscricao' : $_GET['inscricao'];

            $settings = array(
                'field_groups' => array($atts['form-group-id']),
                'id' => 'oscar-main-form',
                'post_id' => $post_inscricao,
                'new_post' => array(
                    'post_type' => 'inscricao',
                    'post_status' => 'publish'
                ),
                'updated_message' => 'Inscrição enviada com sucesso.',
                'return' => $atts['return'],
				'uploader' => 'basic',
                'submit_value' => 'Salvar dados'
            );
            acf_form($settings);
        endif;

        return ob_get_clean();
    }

    /**
     * Authentication form
     *
     * @param $atts
     * @return string
     */
    public function oscar_minc_auth_form($atts)
    {
		if ($_POST['reg_submit']) {
			$this->validation();
			$this->registration();
		}

		$name = null;
		$email = null;
		$cnpj = null;
		$password = null;

		if ( is_user_logged_in() ) {
			$current_user = wp_get_current_user();
			$name = $current_user->display_name;
			$email = $current_user->user_email;
            $company = get_user_meta( $current_user->ID, '_user_company', true );
			$cnpj = OscarMinC::mask(get_user_meta( $current_user->ID, '_user_cnpj', true ), '##.###.###/####-##');
            $phone = get_user_meta( $current_user->ID, '_user_phone', true );
            $distributor = get_user_meta( $current_user->ID, '_user_distributor', true );
			$address = get_user_meta( $current_user->ID, '_user_address', true );
			$state = get_user_meta( $current_user->ID, '_user_state', true );
			$city = get_user_meta( $current_user->ID, '_user_city', true );
			$zipcode = get_user_meta( $current_user->ID, '_user_zipcode', true );
        }

		ob_start();
        if ( !is_user_logged_in() ) : ?>
        <div class="text-right">
            <p>Já possui cadastro? Faça login <b><a href="<?php echo home_url('/login'); ?>">aqui</a>.</b></p>
        </div>
        <?php endif; ?>
        <form id="oscar-register-form" method="post" action="<?php echo esc_url($_SERVER['REQUEST_URI']); ?>">
            <div class="login-form row">
                <div class="form-group col-md-6">
                    <label class="login-field-icon fui-user" for="reg-name">Nome completo <span style="color: red;">*</span></label>
                    <input name="reg_name" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['reg_name']) ? $_POST['reg_name'] : $name); ?>"
                           id="reg-name" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-6">
                    <label class="login-field-icon fui-mail" for="reg-email">Email <span style="color: red;">*</span></label>
                    <input name="reg_email" type="email" class="form-control login-field"
                           value="<?php echo(isset($_POST['reg_email']) ? $_POST['reg_email'] : $email); ?>"
                           id="reg-email" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-user" for="company">Empresa produtora <span style="color: red;">*</span></label>
                    <input name="company" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['company']) ? $_POST['company'] : $company); ?>"
                           id="company"/>
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-lock" for="reg-cnpj">CNPJ <span style="color: red;">*</span></label>
                    <input name="cnpj" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['cnpj']) ? $_POST['cnpj'] : $cnpj); ?>"
                           placeholder="00.000.000/0000-00" id="reg-cnpj" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-user" for="phone">Telefone <span style="color: red;">*</span></label>
                    <input name="phone" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['phone']) ? $_POST['phone'] : $phone); ?>"
                           placeholder="(00) 0000-0000" id="phone" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-12">
                    <label class="login-field-icon fui-user" for="distributor">Distribuidora nos EUA (se houver)</label>
                    <input name="distributor" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['distributor']) ? $_POST['distributor'] : $distributor); ?>"
                           id="distributor"/>
                </div>

                <div class="form-group col-md-12">
                    <label class="login-field-icon fui-lock" for="address">Endereço <span style="color: red;">*</span></label>
                    <input name="address" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['address']) ? $_POST['address'] : $address); ?>"
                           id="address" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-lock" for="state">Estado <span style="color: red;">*</span></label>
                    <select id="state" class="form-control" name="state" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>>
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
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-lock" for="city">Cidade <span style="color: red;">*</span></label>
                    <input name="city" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['city']) ? $_POST['city'] : $city); ?>"
                           id="city" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-4">
                    <label class="login-field-icon fui-lock" for="zipcode">CEP <span style="color: red;">*</span></label>
                    <input name="zipcode" type="text" class="form-control login-field"
                           value="<?php echo(isset($_POST['zipcode']) ? $_POST['zipcode'] : $zipcode); ?>"
                           placeholder="00000-000" id="zipcode" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-6">
                    <label class="login-field-icon fui-lock" for="reg-pass">Senha <?php echo is_user_logged_in() ? '' : '<span style="color: red;">*</span>'; ?></label>
                    <input name="reg_password" type="password" class="form-control login-field"
                           value="<?php echo(isset($_POST['reg_password']) ? $_POST['reg_password'] : null); ?>"
                           placeholder="" id="reg-pass" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-6">
                    <label class="login-field-icon fui-lock" for="reg-pass-repeat">Repita a senha <?php echo is_user_logged_in() ? '' : '<span style="color: red;">*</span>'; ?></label>
                    <input name="reg_password_repeat" type="password" class="form-control login-field"
                           value="<?php echo(isset($_POST['reg_password_repeat']) ? $_POST['reg_password_repeat'] : null); ?>"
                           placeholder="" id="reg-pass-repeat" <?php echo is_user_logged_in() ? '' : 'required'; ?>/>
                </div>

                <div class="form-group col-md-12 text-right">
                    <input class="btn btn-default" type="submit" name="reg_submit" value="<?php echo is_user_logged_in() ? 'Atualizar' : 'Cadastrar'; ?>"/>
                </div>
            </div>
        <?php if( is_user_logged_in() ): ?>
            <input type="hidden" name="is-updating" value="1">
            <input type="hidden" name="user-id" value="<?php echo $current_user->ID; ?>">
        <?php endif; ?>
        </form>

        <p class="text-right"><small>Campos marcados com <span style="color: red;">*</span> são obrigatórios.</small></p>
		<?php return ob_get_clean();
    }

    /**
     * Register validation
     *
     * @return WP_Error
     */
    private function validation()
    {
        $username = $_POST['reg_name'];
        $email = $_POST['reg_email'];
        $company = $_POST['company'];
        $cnpj = $_POST['cnpj'];
        $phone = $_POST['phone'];
        $address = $_POST['address'];
        $state = $_POST['state'];
        $city = $_POST['city'];
        $zipcode = $_POST['zipcode'];
        $password = $_POST['reg_password'];
        $reg_password_repeat = $_POST['reg_password_repeat'];
		$is_updating = isset( $_POST['is-updating'] ) ? true : false;

		if( !$is_updating ){
			if (
                empty($username) ||
                empty($password) ||
                empty($email) ||
                empty($company) ||
                empty($cnpj) ||
                empty($phone) ||
                empty($address) ||
                empty($state) ||
                empty($city) ||
                empty($zipcode)
            ) {
				return new WP_Error('field', 'Existem campos obrigatórios não preenchidos.');
			}
        } else {
            if (
                empty($username) ||
                empty($email) ||
                empty($company) ||
                empty($cnpj) ||
                empty($phone) ||
                empty($address) ||
                empty($state) ||
                empty($city) ||
                empty($zipcode)
            ) {
				return new WP_Error('field', 'Existem campos obrigatórios não preenchidos.');
			}
        }

		if( !$is_updating ){
            if (strlen($password) < 5) {
                return new WP_Error('password', 'A senha está muito curta.');
            }
        } else {
            if ( !empty($password) && strlen($password) < 5) {
                return new WP_Error('password', 'A senha está muito curta.');
            }
        }

        if (!is_email($email)) {
            return new WP_Error('email_invalid', 'O email parece ser inválido');
        }

        if (email_exists($email) && !$is_updating) {
            return new WP_Error('email', 'Este email já sendo utilizado, para cadastrar um novo filme, por favor utilize outro email.');
        }

        if ($password !== $reg_password_repeat) {
            return new WP_Error('password', 'As senhas inseridas são diferentes.');
        }

        if (strlen(str_replace('.', '', str_replace('-', '', str_replace('/', '', $cnpj)))) !== 14) {
            return new WP_Error('cnpj', 'O CNPJ é inválido.');
        }
    }

    /**
     * Register user
     *
     */
    private function registration()
    {
        $username = $_POST['reg_name'];
        $email = $_POST['reg_email'];
        $company = $_POST['company'];
        $cnpj = str_replace('.', '', str_replace('-', '', str_replace('/', '', $_POST['cnpj'])));
        $phone = $_POST['phone'];
        $distributor = $_POST['distributor'];
        $address = $_POST['address'];
        $state = $_POST['state'];
        $city = $_POST['city'];
        $zipcode = $_POST['zipcode'];
        $password = $_POST['reg_password'];
        $user_id = $_POST['user-id'];
        $is_updating = isset( $_POST['is-updating'] ) ? true : false;

        $userdata = array(
            'first_name' => esc_attr($username),
            'display_name' => esc_attr($username),
            'user_login' => esc_attr($email),
            'user_email' => esc_attr($email),
            'user_pass' => esc_attr($password)
        );

        $errors = $this->validation();

        if (is_wp_error($errors)) :
            echo '<div class="alert alert-danger">';
            echo '<strong>' . $errors->get_error_message() . '</strong>';
            echo '</div>';
        else :
            if ( $is_updating ) {
				$userdata = array(
					'ID' => $user_id,
					'first_name' => esc_attr($username),
					'display_name' => esc_attr($username),
					'user_login' => esc_attr($email),
					'user_email' => esc_attr($email),
					'user_pass' => esc_attr($password)
				);

				$user_id = wp_update_user($userdata);

				if ( is_wp_error( $user_id ) ) {
					echo '<div class="alert alert-danger">';
					echo '<strong>' . $user_id->get_error_message() . '</strong>';
					echo '</div>';
				} else {

                    update_user_meta( $user_id, '_user_company', esc_attr($company) );
                    update_user_meta( $user_id, '_user_cnpj', esc_attr($cnpj) );
                    update_user_meta( $user_id, '_user_phone', esc_attr($phone) );
                    update_user_meta( $user_id, '_user_distributor', esc_attr($distributor) );
                    update_user_meta( $user_id, '_user_address', esc_attr($address) );
                    update_user_meta( $user_id, '_user_state', esc_attr($state) );
                    update_user_meta( $user_id, '_user_city', esc_attr($city) );
                    update_user_meta( $user_id, '_user_zipcode', esc_attr($zipcode) );

					echo '<div class="alert alert-success">';
					echo 'Cadastro atualizado com sucesso.';
					echo '</div>';
				}
            } else {
				$register_user = wp_insert_user($userdata);
				if (!is_wp_error($register_user)) {

					add_user_meta($register_user, '_user_company', esc_attr($company), true);
					add_user_meta($register_user, '_user_cnpj', esc_attr($cnpj), true);
					add_user_meta($register_user, '_user_phone', esc_attr($phone), true);
                    add_user_meta($register_user, '_user_distributor', esc_attr($distributor), true);
					add_user_meta($register_user, '_user_address', esc_attr($address), true);
					add_user_meta($register_user, '_user_state', esc_attr($state), true);
					add_user_meta($register_user, '_user_city', esc_attr($city), true);
					add_user_meta($register_user, '_user_zipcode', esc_attr($zipcode), true);

					echo '<div class="alert alert-success">';
					echo 'Cadastro realizado com sucesso. Você será redirionado para a tela de login em <b class="time-before-redirect">5</b> segundos, caso isso não ocorra automaticamente, clique <strong><a href="' . home_url('/login') . '">aqui</a></strong>!';
					echo '</div>';
					$_POST = array(); ?>
                    <script type="text/javascript">
                        var counter = 5;
                        var interval = setInterval(function() {
                            counter--;
                            $('.time-before-redirect').text(counter);
                            if (counter === 0) {
                                clearInterval(interval);
                                window.location = '<?php echo home_url("/login"); ?>';
                            }
                        }, 1000);
                    </script>
				<?php } else {
					echo '<div class="alert alert-danger">';
					echo '<strong>' . $register_user->get_error_message() . '</strong>';
					echo '</div>';
				}
            }
        endif;

    }

    /**
     * Login form
     *
     */
    public function oscar_minc_login_form()
    {
	    ob_start(); ?>

        <div class="text-right">
            <p>Ainda não possui cadastro? Faça o seu <b><a href="<?php echo home_url('/cadastro'); ?>">aqui</a>.</b></p>
        </div>

        <?php if ( isset( $_GET['login'] ) && $_GET['login'] === 'failed' ) : ?>
        <div class="alert alert-danger" role="alert">
            Erro ao realizar o login. Por favor, verifique as informações e tente novamente
        </div>
        <?php endif;

		if ( isset( $_GET['checkemail'] ) && $_GET['checkemail'] === 'confirm' ) : ?>
            <div class="alert alert-success" role="alert">
                Cheque seu email para recuperar sua senha.
            </div>
		<?php endif;

        wp_login_form(
            array(
                'redirect' => home_url(),
                'form_id' => 'oscar-login-form',
                'label_username' => __('Endereço de e-mail'),
                'value_username' => isset( $_COOKIE['log'] ) ? $_COOKIE['log'] : null
            )
        ); ?>

        <!--<p><a href="<?php /*echo wp_lostpassword_url( home_url() ); */?>" class="forget-password-link" title="Esqueceu a senha?">Esqueceu a senha?</a></p>-->

        <?php

	    return ob_get_clean();
    }

    /**
     * Show users subscriptions
     *
     */
    public function oscar_minc_user_subscriptions()
    {
    	if( is_admin() )
    		return;

	    ob_start();
        $current_user = wp_get_current_user();
        $args = array(
            'posts_per_page' => -1,
            'post_type' => 'inscricao',
            'order' => 'ASC',
            'author' => $current_user->ID
        );
        $the_query = new WP_Query( $args );

        if ( $the_query->have_posts() ) { ?>
            <table class="table">
                <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Data de inscrição</th>
                    <th scope="col">Título do filme</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Ações</th>
                </tr>
                </thead>
                <tbody>
                <?php $i = 1; while ( $the_query->have_posts() ) : $the_query->the_post(); ?>
                    <tr>
                        <td><?php echo $i; ?></td>
                        <td><?php echo get_the_date(); ?></td>
                        <td><?php echo get_field('titulo_do_filme') ? get_field('titulo_do_filme') : '-'; ?></td>
                        <td><?php echo get_post_meta( get_the_ID(), 'movie_attachment_id', true ) ? 'Filme enviado' : 'Filme <b>não</b> enviado'; ?></td>
                        <td>
                            <?php if( !get_post_meta( get_the_ID(), 'movie_attachment_id', true ) ): ?>
                                <a href="<?php echo home_url('/inscricao') . '?inscricao=' . get_the_ID(); ?>" class="btn btn-primary btn-sm" role="button" data-toggle="tooltip" data-placement="top" title="Editar inscrição">
	                                <i class="fa fa-edit"></i>
	                                <span>Editar</span>
                                </a>
                                <a href="<?php echo home_url('/enviar-filme') . '?inscricao=' . get_the_ID(); ?>" class="btn btn-primary btn-sm" role="button" data-toggle="tooltip" data-placement="top" title="Enviar filme">
                                    <i class="fa fa-paper-plane"></i>
	                                <span>Enviar</span>
                                </a>
                            <?php else: ?>
                                <span data-toggle="tooltip" data-placement="top" title="Solicitar suporte">
                                    <a href="#"
                                       class="ask-for-support-link btn btn-primary btn-sm"
                                       role="button"
                                       data-toggle="modal"
                                       data-target="#support-modal"
                                       data-movie-name="<?php the_field('titulo_do_filme'); ?>"
                                       data-post-id="<?php the_ID(); ?>">
                                        <i class="fa fa-question-circle"></i>
	                                    <span>Solicitar suporte</span>
                                    </a>
                                </span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php $i++; endwhile; ?>
                </tbody>
            </table>
            <a href="<?php echo home_url('/inscricao'); ?>" class="btn btn-primary float-right"><i class="fa fa-plus"></i> Realizar nova inscrição</a>

            <div class="modal fade" id="support-modal" tabindex="-1" role="dialog" aria-labelledby="support-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="support-modal-title">Solicitar suporte</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form id="support-form">
                            <div class="modal-body">
                                <div class="alert alert-success d-none" role="alert"></div>
                                <div class="alert alert-danger d-none" role="alert"></div>
                                <div class="form-fields">
                                    <div class="form-group row">
                                        <label for="movie-name" class="col-sm-2 col-form-label">Filme</label>
                                        <div class="col-sm-10">
                                            <input type="text" readonly class="form-control-plaintext" id="movie-name" value="">
                                        </div>
                                    </div>
                                    <div class="form-group row">
                                        <label for="support-reason" class="col-sm-2 col-form-label">Motivo</label>
                                        <div class="col-sm-10">
                                            <input type="text" class="form-control" id="support-reason" required>
                                        </div>
                                    </div>
                                    <div class="form-group row">
                                        <label for="support-message" class="col-sm-2 col-form-label">Mensagem</label>
                                        <div class="col-sm-10">
                                            <textarea class="form-control" id="support-message" rows="3" required></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary">Enviar</button>
                            </div>
                            <input type="hidden" id="post-id" name="post-id" value="">
                        </form>
                    </div>
                </div>
            </div>

            <?php wp_reset_postdata();
        } else { ?>
	        <p>Você ainda não possui nenhuma inscrição.</p>
            <a href="<?php echo home_url('/inscricao'); ?>" class="btn btn-primary ">Realizar inscrição</a>
        <?php }

	    return ob_get_clean();
    }

	/**
     * Upload movie form
     *
	 * @return string
	 */
    public function oscar_minc_video_upload_form()
    {
		$oscar_minc_options = get_option('oscar_minc_options');


	    $author_id = get_post_field( 'post_author', $_GET['inscricao'] );
	    $current_user_id = get_current_user_id();

	    ob_start();

	    if( !empty($_GET['inscricao']) && $author_id != $current_user_id ) {
		    echo '<p>Selecione uma inscrição para enviar o vídeo <a href="'. home_url('/minhas-inscricoes') .'">aqui.</a></p>';
		    return ob_get_clean();
	    }

        if( !empty($_GET['inscricao']) ): ?>

            <?php if( !get_post_meta( $_GET['inscricao'], 'movie_attachment_id', true ) ): ?>

                <p>Filme: <b><?php echo get_post_meta($_GET['inscricao'], 'titulo_do_filme', true); ?></b>.</p>

                <div id="info-alert" class="alert alert-primary" role="alert">
                    <p>Tamanho máximo para o arquivo de vídeo: <b><?php echo $oscar_minc_options['oscar_minc_movie_max_size']; ?>Gb</b>. Velocidade de conexão mínima sugerida: <b>10Mb</b>.</p>
                    <p>Resolução mínima <b>720p</b>. Formatos permitidos: <b><?php echo $oscar_minc_options['oscar_minc_movie_extensions'] ?></b>.</p>
                </div>

                <div id="error-alert" class="alert alert-danger d-none" role="alert"></div>

                <form id="oscar-video-form" method="post" action="<?php echo get_the_permalink() ?>">
                    <div class="form-group text-center video-drag-area dropzone">
                        <input type="hidden" id="post_id" name="post_id" value="<?php echo $_GET['inscricao']; ?>">
                        <input type="hidden" id="movie_max_size" value="<?php echo intval($oscar_minc_options['oscar_minc_movie_max_size']) * pow(1024,3); ?>">
                        <input type="file" id="oscar-video" name="oscar-video" class="inputfile" accept=".<?php echo str_replace(', ', ', .', $oscar_minc_options['oscar_minc_movie_extensions']); ?>">
                        <label id="oscar-video-btn" for="oscar-video"><i class="fa fa-upload"></i> Selecione seu vídeo</label>
                        <p id="oscar-video-name" class="help-block"></p>
                    </div>
                    <div id="upload-status" class="form-group hidden">
                        <div class="progress">
                            <div class="progress-bar progress-bar-success progress-bar-striped myprogress progress-bar-animated" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
                                <span class="sr-only">40% Complete (success)</span>
                            </div>
                        </div>
                        <div class="panel panel-default msg"></div>
                    </div>
                    <div class="text-right">
                        <button id="oscar-video-upload-btn" type="submit" class="btn btn-default" disabled>Enviar</button>
                    </div>
                </form>

            <?php else: ?>
                <p>Seu filme foi enviado com sucesso.</p>
            <?php endif ?>

        <?php else: ?>

            <p>Selecione uma inscrição para enviar o vídeo <a href="<?php echo home_url('/minhas-inscricoes'); ?>">aqui.</a></p>

        <?php endif;

        return ob_get_clean();
    }

	/**
	 * A shortcode for rendering the form used to initiate the password reset.
	 *
	 * @param  array   $attributes  Shortcode attributes.
	 * @param  string  $content     The text content for shortcode. Not used.
	 *
	 * @return string  The shortcode output
     *
	 */
	public function render_password_lost_form( $attributes, $content = null )
    { ?>

        <div id="password-lost-form" class="widecolumn">
            <p>Digite seu nome de usuário ou endereço de e-mail. Você receberá um link para criar uma nova senha via e-mail.</p>

            <form id="lostpasswordform" action="<?php echo wp_lostpassword_url(); ?>" method="post">
                <div class="row">
                    <div class="form-group col-md-12">
                        <label for="user_login">Email</label>
                        <input type="text" name="user_login" id="user_login" class="form-control login-field">
                    </div>
                    <div class="form-group col-md-12 text-right">
                        <input type="submit" name="submit" class="lostpassword-button btn btn-default" value="Recuperar senha"/>
                    </div>
                </div>
            </form>
        </div>
	<?php }

}