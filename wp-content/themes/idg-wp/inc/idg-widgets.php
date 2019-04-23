<?php

/**
 * Feature Card Widget
 *
 */
class Feature_Card extends WP_Widget
{

	function __construct()
	{
		parent::__construct(
			'feature_card',
			esc_html__('Feature Card', 'idg-wp'),
			array(
				'description' => esc_html__('A feature card with custom icon and link', 'idg-wp'),
				'customize_selective_refresh' => true
			)
		);

		// Register our Feature Card Widget
		add_action('widgets_init', function () {
			register_widget('Feature_Card');
		});
	}

	public function widget($args, $instance)
	{
		echo $args['before_widget']; ?>

		<div
			class="feature-card text-center <?php echo !empty($instance['card-model']) ? $instance['card-model'] : ''; ?>">

			<a href="<?php echo !empty($instance['link']) ? $instance['link'] : ''; ?>" <?php echo !empty($instance['target']) ? 'target="_blank"' : ''; ?>>
				<div class="align">
					<div class="icon <?php echo $instance['icon']; ?>">
						<?php if ($instance['icon'] === 'upload-custom-icon'): ?>
							<img class="custom-icon-preview"
								 src="<?php echo wp_get_attachment_url($instance['custom-icon']); ?> ">
						<?php endif; ?>
					</div>
					<h3 class="card-title">
						<?php echo !empty($instance['title']) ? $instance['title'] : ''; ?>
					</h3>

					<?php if (!empty($instance['desc']) && $instance['card-model'] === 'card-3'): ?>
						<p class="card-desc"><?php echo $instance['desc']; ?></p>
					<?php endif; ?>

					<?php if ($instance['card-model'] === 'card-3'): ?>
						<button type="button" class="card-btn btn"><?php echo $instance['btn-text']; ?></button>
					<?php endif; ?>
				</div>
			</a>

		</div>

		<?php
		echo $args['after_widget'];
	}

	public function form($instance)
	{
		$title = !empty($instance['title']) ? $instance['title'] : esc_html__('Feature Card', 'idg-wp');
		$link = !empty($instance['link']) ? $instance['link'] : '';
		$target = !empty($instance['target']) ? $instance['target'] : '';
		$icon = !empty($instance['icon']) ? $instance['icon'] : '';
		$custom_icon = !empty($instance['custom-icon']) ? $instance['custom-icon'] : '';
		$card_model = !empty($instance['card-model']) ? $instance['card-model'] : '';
		$desc = !empty($instance['desc']) ? $instance['desc'] : esc_html__('Card description text', 'idg-wp');
		$btn_text = !empty($instance['btn-text']) ? $instance['btn-text'] : esc_html__('Acess', 'idg-wp'); ?>
		<div class="idg-feature-card-widget">
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php esc_attr_e('Title:', 'idg-wp'); ?></label>
				<input class="widefat card-title" id="<?php echo esc_attr($this->get_field_id('title')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text"
					   value="<?php echo esc_attr($title); ?>">
			</p>
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('link')); ?>"><?php esc_attr_e('Link:', 'idg-wp'); ?></label>
				<input class="widefat card-link" id="<?php echo esc_attr($this->get_field_id('link')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('link')); ?>" type="text"
					   value="<?php echo esc_attr($link); ?>">
			</p>
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('target')); ?>"><?php esc_attr_e('Open in new window:', 'idg-wp'); ?></label>
				<input class="card-target" id="<?php echo esc_attr($this->get_field_id('target')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('target')); ?>" type="checkbox"
					   value="1" <?php checked('1', $target, true); ?>>
			</p>
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('icon')); ?>"><?php esc_attr_e('Select the icon:', 'idg-wp'); ?></label>
				<select class="widefat icon-selector" id="<?php echo esc_attr($this->get_field_id('icon')); ?>"
						name="<?php echo esc_attr($this->get_field_name('icon')); ?>">

					<option <?php echo $icon == 'icon-lei-incentivo' ? 'selected' : ''; ?>
						value="icon-lei-incentivo">lei-incentivo
					</option>
					<option <?php echo $icon == 'icon-acoes-programadas' ? 'selected' : ''; ?>
						value="icon-acoes-programadas">acoes-programadas
					</option>
					<option <?php echo $icon == 'icon-angle_down' ? 'selected' : ''; ?> value="icon-angle_down">
						angle_down
					</option>
					<option <?php echo $icon == 'icon-angle_left' ? 'selected' : ''; ?> value="icon-angle_left">
						angle_left
					</option>
					<option <?php echo $icon == 'icon-angle_right' ? 'selected' : ''; ?> value="icon-angle_right">
						angle_right
					</option>
					<option <?php echo $icon == 'icon-angle_up' ? 'selected' : ''; ?> value="icon-angle_up">angle_up
					</option>
					<option <?php echo $icon == 'icon-apoio' ? 'selected' : ''; ?> value="icon-apoio">apoio</option>
					<option <?php echo $icon == 'icon-arrow_down' ? 'selected' : ''; ?> value="icon-arrow_down">
						arrow_down
					</option>
					<option <?php echo $icon == 'icon-arrow_left' ? 'selected' : ''; ?> value="icon-arrow_left">
						arrow_left
					</option>
					<option <?php echo $icon == 'icon-arrow_right' ? 'selected' : ''; ?> value="icon-arrow_right">
						arrow_right
					</option>
					<option <?php echo $icon == 'icon-arrow_top' ? 'selected' : ''; ?> value="icon-arrow_top">
						arrow_top
					</option>
					<option <?php echo $icon == 'icon-assessoria' ? 'selected' : ''; ?> value="icon-assessoria">
						assessoria
					</option>
					<option <?php echo $icon == 'icon-calendar' ? 'selected' : ''; ?> value="icon-calendar">calendar
					</option>
					<option <?php echo $icon == 'icon-centros-culturais' ? 'selected' : ''; ?>
						value="icon-centros-culturais">centros-culturais
					</option>
					<option <?php echo $icon == 'icon-checkmark' ? 'selected' : ''; ?> value="icon-checkmark">
						checkmark
					</option>
					<option <?php echo $icon == 'icon-clock' ? 'selected' : ''; ?> value="icon-clock">clock</option>
					<option <?php echo $icon == 'icon-consultas-publicas' ? 'selected' : ''; ?>
						value="icon-consultas-publicas">consultas-publicas
					</option>
					<option <?php echo $icon == 'icon-contrast' ? 'selected' : ''; ?> value="icon-contrast">contrast
					</option>
					<option <?php echo $icon == 'icon-dados-br' ? 'selected' : ''; ?> value="icon-dados-br">dados-br
					</option>
					<option <?php echo $icon == 'icon-double-checkmark' ? 'selected' : ''; ?>
						value="icon-double-checkmark">double-checkmark
					</option>
					<option <?php echo $icon == 'icon-economia-criativa' ? 'selected' : ''; ?>
						value="icon-economia-criativa">economia-criativa
					</option>
					<option <?php echo $icon == 'icon-editais' ? 'selected' : ''; ?> value="icon-editais">editais
					</option>
					<option <?php echo $icon == 'icon-escritorios-regionais' ? 'selected' : ''; ?>
						value="icon-escritorios-regionais">escritorios-regionais
					</option>
					<option <?php echo $icon == 'icon-eye' ? 'selected' : ''; ?> value="icon-eye">eye</option>
					<option <?php echo $icon == 'icon-fale-conosco' ? 'selected' : ''; ?> value="icon-fale-conosco">
						fale-conosco
					</option>
					<option <?php echo $icon == 'icon-home' ? 'selected' : ''; ?> value="icon-home">home</option>
					<option <?php echo $icon == 'icon-internacional' ? 'selected' : ''; ?> value="icon-internacional">
						internacional
					</option>
					<option <?php echo $icon == 'icon-legislacao' ? 'selected' : ''; ?> value="icon-legislacao">
						legislacao
					</option>
					<option <?php echo $icon == 'icon-lei-rouanet' ? 'selected' : ''; ?> value="icon-lei-rouanet">
						lei-rouanet
					</option>
					<option <?php echo $icon == 'icon-less' ? 'selected' : ''; ?> value="icon-less">less</option>
					<option <?php echo $icon == 'icon-libras' ? 'selected' : ''; ?> value="icon-libras">libras</option>
					<option <?php echo $icon == 'icon-location' ? 'selected' : ''; ?> value="icon-location">location
					</option>
					<option <?php echo $icon == 'icon-ministerio' ? 'selected' : ''; ?> value="icon-ministerio">
						ministerio
					</option>
					<option <?php echo $icon == 'icon-ministro' ? 'selected' : ''; ?> value="icon-ministro">ministro
					</option>
					<option <?php echo $icon == 'icon-multimidia' ? 'selected' : ''; ?> value="icon-multimidia">
						multimidia
					</option>
					<option <?php echo $icon == 'icon-noticias' ? 'selected' : ''; ?> value="icon-noticias">noticias
					</option>
					<option <?php echo $icon == 'icon-ouvidoria' ? 'selected' : ''; ?> value="icon-ouvidoria">
						ouvidoria
					</option>
					<option <?php echo $icon == 'icon-patrimonio' ? 'selected' : ''; ?> value="icon-patrimonio">
						patrimonio
					</option>
					<option <?php echo $icon == 'icon-play_btn' ? 'selected' : ''; ?> value="icon-play_btn">play_btn
					</option>
					<option <?php echo $icon == 'icon-plus' ? 'selected' : ''; ?> value="icon-plus">plus</option>
					<option <?php echo $icon == 'icon-pontos-cultura' ? 'selected' : ''; ?> value="icon-pontos-cultura">
						pontos-cultura
					</option>
					<option <?php echo $icon == 'icon-publicacoes' ? 'selected' : ''; ?> value="icon-publicacoes">
						publicacoes
					</option>
					<option <?php echo $icon == 'icon-search' ? 'selected' : ''; ?> value="icon-search">search</option>
					<option <?php echo $icon == 'icon-search_b' ? 'selected' : ''; ?> value="icon-search_b">search_b
					</option>
					<option <?php echo $icon == 'icon-secretarias' ? 'selected' : ''; ?> value="icon-secretarias">
						secretarias
					</option>
					<option <?php echo $icon == 'icon-settings' ? 'selected' : ''; ?> value="icon-settings">settings
					</option>
					<option <?php echo $icon == 'icon-smartphone' ? 'selected' : ''; ?> value="icon-smartphone">
						smartphone
					</option>
					<option <?php echo $icon == 'icon-snc' ? 'selected' : ''; ?> value="icon-snc">snc</option>
					<option <?php echo $icon == 'icon-vinculada' ? 'selected' : ''; ?> value="icon-vinculada">
						vinculada
					</option>

					<option <?php echo $icon == 'upload-custom-icon' ? 'selected' : ''; ?> value="upload-custom-icon">
						personalizado
					</option>
				</select>
			</p>

			<p class="card-desc-wrapper custom-icon <?php echo $icon !== 'upload-custom-icon' ? 'hidden' : ''; ?>">
				<label
					for="<?php echo $this->get_field_name('custom-icon'); ?>"><?php _e('Image:', 'idg-wp'); ?></label>
				<input name="<?php echo $this->get_field_name('custom-icon'); ?>"
					   id="<?php echo $this->get_field_id('custom-icon'); ?>" class="widefat hidden" type="text"
					   value="<?php echo $custom_icon; ?>"/>
				<input class="upload_image_button" type="button" value="<?php _e('Upload image', 'idg-wp'); ?>"/>
			</p>

			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('card-model')); ?>"><?php esc_attr_e('Card model:', 'idg-wp'); ?></label>
				<select class="widefat card-model" id="<?php echo esc_attr($this->get_field_id('card-model')); ?>"
						name="<?php echo esc_attr($this->get_field_name('card-model')); ?>">
					<option <?php echo $card_model == 'card-1' ? 'selected' : ''; ?>
						value="card-1"><?php _e('Model 1', 'idg-wp'); ?></option>
					<option <?php echo $card_model == 'card-2' ? 'selected' : ''; ?>
						value="card-2"><?php _e('Model 2', 'idg-wp'); ?></option>
					<option <?php echo $card_model == 'card-3' ? 'selected' : ''; ?>
						value="card-3"><?php _e('Model 3', 'idg-wp'); ?></option>
				</select>
			</p>

			<p class="card-desc-wrapper <?php echo $card_model !== 'card-3' ? 'hidden' : ''; ?>">
				<label
					for="<?php echo esc_attr($this->get_field_id('desc')); ?>"><?php esc_attr_e('Description text:', 'idg-wp'); ?></label>
				<input class="widefat card-desc" id="<?php echo esc_attr($this->get_field_id('desc')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('desc')); ?>" type="text"
					   value="<?php echo esc_attr($desc); ?>">
			</p>

			<p class="card-desc-wrapper <?php echo $card_model !== 'card-3' ? 'hidden' : ''; ?>">
				<label
					for="<?php echo esc_attr($this->get_field_id('btn-text')); ?>"><?php esc_attr_e('Button text:', 'idg-wp'); ?></label>
				<input class="widefat card-btn-text" id="<?php echo esc_attr($this->get_field_id('btn-text')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('btn-text')); ?>" type="text"
					   value="<?php echo esc_attr($btn_text); ?>">
			</p>

			<div class="feature-card static-height <?php echo $card_model; ?>">
				<div class="align">
					<div class="icon <?php echo !empty($icon) ? $icon : 'icon-plus'; ?>">
						<?php if ($icon === 'upload-custom-icon'): ?>
							<img class="custom-icon-preview" src="<?php echo wp_get_attachment_url($custom_icon); ?> ">
						<?php endif; ?>
					</div>
					<h3 class="card-title"><?php echo $title; ?></h3>
					<p class="card-desc"><?php echo $card_model === 'card-3' ? $desc : ''; ?></p>
					<a class="card-btn btn" href="#">Acesse</a>
				</div>
			</div>
		</div>
		<?php
	}

	public function update($new_instance, $old_instance)
	{
		$instance = array();
		$instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
		$instance['link'] = (!empty($new_instance['link'])) ? sanitize_text_field($new_instance['link']) : '';
		$instance['target'] = (!empty($new_instance['target'])) ? sanitize_text_field($new_instance['target']) : '';
		$instance['icon'] = (!empty($new_instance['icon'])) ? sanitize_text_field($new_instance['icon']) : '';
		$instance['custom-icon'] = (!empty($new_instance['custom-icon'])) ? sanitize_text_field($new_instance['custom-icon']) : '';
		$instance['card-model'] = (!empty($new_instance['card-model'])) ? sanitize_text_field($new_instance['card-model']) : '';
		$instance['desc'] = (!empty($new_instance['desc'])) ? sanitize_text_field($new_instance['desc']) : '';
		$instance['btn-text'] = (!empty($new_instance['btn-text'])) ? sanitize_text_field($new_instance['btn-text']) : '';

		return $instance;
	}

}

$feature_card = new Feature_Card();

/**
 * Adds a Banners widget.
 */
class IDG_Banners extends WP_Widget
{

	function __construct()
	{
		parent::__construct(
			'idg_banner', // Base ID
			esc_html__('Banners', 'idg-wp'), // Name
			array('description' => esc_html__('Banner management widget', 'idg-wp'),) // Args
		);

		// Register our Banners Widget
		add_action('widgets_init', function () {
			register_widget('IDG_Banners');
		});

		add_action('admin_enqueue_scripts', array($this, 'idg_banner_scripts'));
	}

	public function idg_banner_scripts()
	{
		wp_enqueue_style('thickbox');
		wp_enqueue_script('thickbox');
		wp_enqueue_script('media-upload');
	}

	public function widget($args, $instance)
	{
		echo $args['before_widget'];
		if (!empty($instance['title'])) {
			echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
		} ?>

		<div class="row">
			<?php

			if (!empty($instance['description'])) {
				echo '<div class="col-12"><p>' . $instance['description'] . '</p></div>';
			}

			$n = $instance['number_of_banners'] ? intval($instance['number_of_banners']) : 1;
			for ($i = 0; $i < $n; $i++) :

				$col = '';
				switch ($instance['columns'][$i]) {
					case '3':
						$col = 'col-lg-12';
						break;
					case '2':
						$col = 'col-lg-6';
						break;
					case '1':
						$col = 'col-lg-4';
						break;
				}
				// TODO
				$col = 'col';
				?>

				<div class="<?php echo $col; ?> order-<?php echo $instance['order'][$i]; ?>">
					<a href="<?php echo $instance['link_url'][$i] ? $instance['link_url'][$i] : '#'; ?>"
						<?php echo $instance['link_title'][$i] ? 'title="' . $instance['link_title'][$i] . '"' : ''; ?>
						<?php echo !empty($instance['target'][$i]) ? 'target="_blank"' : ''; ?> >
						<div class="highlight-box"
							 style="background-image: url('<?php echo wp_get_attachment_url($instance['image'][$i]); ?>')">
							<?php if (!empty($instance['link_title'][$i])): ?>
								<div class="box-body">
									<h3 class="box-title">
										<?php echo $instance['link_title'][$i]; ?>
									</h3>
								</div>
							<?php endif; ?>
						</div>
					</a>
				</div>

			<?php endfor; ?>
		</div>

		<?php
		echo $args['after_widget'];
	}

	public function form($instance)
	{

		$title = '';
		if (!empty($instance['title'])) {
			$title = $instance['title'];
		}

		$description = '';
		if (!empty($instance['description'])) {
			$description = $instance['description'];
		}

		$number_of_banners = '';
		if (!empty($instance['number_of_banners'])) {
			$number_of_banners = $instance['number_of_banners'];
		}

		$link_url = '';
		if (!empty($instance['link_url'])) {
			$link_url = array_values($instance['link_url']);
		}

		$target = '';
		if (!empty($instance['target'])) {
			$target = $instance['target'];
		}

		$link_title = '';
		if (!empty($instance['link_title'])) {
			$link_title = array_values($instance['link_title']);
		}

		$columns = '';
		if (isset($instance['columns'])) {
			$columns = array_values($instance['columns']);
		}

		$order = '';
		if (isset($instance['order'])) {
			$order = array_values($instance['order']);
		}

		$image = '';
		if (isset($instance['image'])) {
			$image = array_values($instance['image']);
		}

		?>
		<div class="idg-banners-widget">

			<p>
				<label for="<?php echo $this->get_field_name('title'); ?>"><?php _e('Title:', 'idg-wp'); ?></label>
				<input class="widefat" id="<?php echo $this->get_field_id('title'); ?>"
					   name="<?php echo $this->get_field_name('title'); ?>" type="text"
					   value="<?php echo esc_attr($title); ?>"/>
			</p>

			<p>
				<label
					for="<?php echo $this->get_field_name('description'); ?>"><?php _e('Description:', 'idg-wp'); ?></label>
				<textarea class="widefat" id="<?php echo $this->get_field_id('description'); ?>"
						  name="<?php echo $this->get_field_name('description'); ?>"
						  type="text"><?php echo esc_attr($description); ?></textarea>
			</p>

			<p>
				<label
					for="<?php echo $this->get_field_name('number_of_banners'); ?>"><?php _e('Quantity of items:', 'idg-wp'); ?></label>
				<input class="widefat number-of-banners-input"
					   id="<?php echo $this->get_field_id('number_of_banners'); ?>"
					   name="<?php echo $this->get_field_name('number_of_banners'); ?>" type="number" min="1"
					   value="<?php echo $number_of_banners ? esc_attr($number_of_banners) : '1'; ?>"/>
			</p>

			<div class="banners-items">
				<?php
				$n = $number_of_banners ? intval($number_of_banners) : 1;
				for ($i = 0; $i < $n; $i++) : ?>
					<div class="banner">
						<p><b>Banner #<?php echo($i + 1); ?></b> <a href="#" class="remove-banner-item">Excluir</a></p>
						<p>
							<label
								for="<?php echo $this->get_field_name('link_url') . '[' . $i . ']'; ?>"><?php _e('Link URL:'); ?></label>
							<input class="widefat" id="<?php echo $this->get_field_id('link_url') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('link_url') . '[' . $i . ']'; ?>" type="text"
								   value="<?php echo esc_attr($link_url[$i]); ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_id('target') . '[' . $i . ']'; ?>"><?php esc_attr_e('Open in new window:', 'idg-wp'); ?></label>
							<input class="card-target"
								   id="<?php echo $this->get_field_id('target') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('target') . '[' . $i . ']'; ?>"
								   type="checkbox" value="1" <?php checked('1', $target [$i], true); ?>>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('link_title') . '[' . $i . ']'; ?>"><?php _e('Link Title:'); ?></label>
							<input class="widefat"
								   id="<?php echo $this->get_field_id('link_title') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('link_title') . '[' . $i . ']'; ?>"
								   type="text" value="<?php echo esc_attr($link_title[$i]); ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('columns') . '[' . $i . ']'; ?>"><?php _e('Columns:'); ?></label>
							<input class="widefat" id="<?php echo $this->get_field_id('columns') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('columns') . '[' . $i . ']'; ?>" type="number"
								   min="1" max="3" value="<?php echo $columns[$i] ? esc_attr($columns[$i]) : '1'; ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('order') . '[' . $i . ']'; ?>"><?php _e('Order:'); ?></label>
							<input class="widefat" id="<?php echo $this->get_field_id('order') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('order') . '[' . $i . ']'; ?>" type="number"
								   min="1" value="<?php echo $order[$i] ? esc_attr($order[$i]) : '1'; ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('image') . '[' . $i . ']'; ?>"><?php _e('Image:', 'idg-wp'); ?></label>
							<img class="banner-img-preview" src="<?php echo wp_get_attachment_url($image[$i]); ?> ">
							<input name="<?php echo $this->get_field_name('image') . '[' . $i . ']'; ?>"
								   id="<?php echo $this->get_field_id('image') . '[' . $i . ']'; ?>"
								   class="widefat hidden" type="text" value="<?php echo $image[$i]; ?>"/>
							<input id="upload_image_button_<?php echo $i; ?>" class="upload_image_button" type="button"
								   value="<?php _e('Upload image', 'idg-wp'); ?>"/>
						</p>
					</div>
				<?php endfor; ?>
			</div>

		</div>

		<?php
	}

	public function update($new_instance, $old_instance)
	{
		$instance = array();
		$instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
		$instance['description'] = (!empty($new_instance['description'])) ? sanitize_text_field($new_instance['description']) : '';
		$instance['number_of_banners'] = (!empty($new_instance['number_of_banners'])) ? sanitize_text_field($new_instance['number_of_banners']) : '';
		$instance['link_url'] = (!empty($new_instance['link_url'])) ? $new_instance['link_url'] : '';
		$instance['target'] = (!empty($new_instance['target'])) ? $new_instance['target'] : '';
		$instance['link_title'] = (!empty($new_instance['link_title'])) ? $new_instance['link_title'] : '';
		$instance['columns'] = (!empty($new_instance['columns'])) ? $new_instance['columns'] : '';
		$instance['order'] = (!empty($new_instance['order'])) ? $new_instance['order'] : '';
		$instance['image'] = (!empty($new_instance['image'])) ? $new_instance['image'] : '';

		return $instance;
	}

}

$idg_banners = new IDG_Banners();

class Text_Image_Box extends WP_Widget
{

	function __construct()
	{
		parent::__construct(
			'text_image_box',
			esc_html__('Text and image', 'idg-wp'),
			array(
				'description' => esc_html__('A simple box with text and image side by side', 'idg-wp'),
				'customize_selective_refresh' => true
			)
		);

		// Register our Feature Card Widget
		add_action('widgets_init', function () {
			register_widget('Text_Image_Box');
		});
	}

	public function widget($args, $instance)
	{
		echo $args['before_widget']; ?>

		<div class="row">
			<?php if ($instance['image_alignment'] == 'right'): ?>
				<div class="col-8">
					<h2 class="section-title mb-5"><?php echo !empty($instance['title']) ? $instance['title'] : ''; ?></h2>
					<?php echo !empty($instance['text']) ? $instance['text'] : ''; ?>
				</div>
				<div class="col-4">
					<?php
					$img_src = wp_get_attachment_image_src($instance['image'], array(350, 350));
					if ($img_src) : ?>
						<img width="100%" class="banner-img-preview" src="<?php echo $img_src[0]; ?>">
					<?php endif; ?>
				</div>
			<?php else: ?>
				<div class="col-4">
					<?php
					$img_src = wp_get_attachment_image_src($instance['image'], array(350, 350));
					if ($img_src) : ?>
						<img width="100%" class="banner-img-preview" src="<?php echo $img_src[0]; ?>">
					<?php endif; ?>
				</div>
				<div class="col-8">
					<h2 class="section-title mb-5"><?php echo !empty($instance['title']) ? $instance['title'] : ''; ?></h2>
					<?php echo !empty($instance['text']) ? $instance['text'] : ''; ?>
				</div>
			<?php endif; ?>
		</div>

		<?php
		echo $args['after_widget'];
	}

	public function form($instance)
	{
		$title = $instance['title'];
		$text = $instance['text'];
		$image = $instance['image'];
		$image_alignment = $instance['image_alignment'];
		?>
		<div class="idg-text-image-box-widget">
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php esc_attr_e('Title:', 'idg-wp'); ?></label>
				<input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>"
					   name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text"
					   value="<?php echo esc_attr($title); ?>">
			</p>
			<p>
				<label for="<?php echo $this->get_field_name('image'); ?>"><?php _e('Image:', 'idg-wp'); ?></label>
				<?php $img_src = wp_get_attachment_image_src($image, 'thumbnail'); ?>
				<img width="100%" class="banner-img-preview" src="<?php echo $img_src[0]; ?>">
				<input name="<?php echo $this->get_field_name('image'); ?>"
					   id="<?php echo $this->get_field_id('image'); ?>" class="widefat hidden" type="text"
					   value="<?php echo $image; ?>"/>
				<input id="upload_image_button" class="upload_image_button" type="button"
					   value="<?php _e('Upload image', 'idg-wp'); ?>"/>
			</p>
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('image_alignment')); ?>"><?php esc_attr_e('Image alignment:', 'idg-wp'); ?></label>
			</p>
			<p>
				<label style="display: block; margin-bottom: 5px;">
					<input type="radio" name="<?php echo esc_attr($this->get_field_name('image_alignment')); ?>"
						   value="left" <?php checked($image_alignment, 'left', true); ?>>
					<?php esc_attr_e('Left', 'idg-wp'); ?>
				</label>
				<label style="display: block">
					<input type="radio" name="<?php echo esc_attr($this->get_field_name('image_alignment')); ?>"
						   value="right" <?php checked($image_alignment, 'right', true); ?>>
					<?php esc_attr_e('Right', 'idg-wp'); ?>
				</label>
			</p>
			<p>
				<label
					for="<?php echo esc_attr($this->get_field_id('text')); ?>"><?php esc_attr_e('Text:', 'idg-wp'); ?></label>
				<textarea class="widefat idg-text hidden" id="<?php echo esc_attr($this->get_field_id('text')); ?>"
						  name="<?php echo esc_attr($this->get_field_name('text')); ?>"><?php echo $text; ?></textarea>
				<textarea class="idg-rich-text"><?php echo esc_attr($text); ?></textarea>
			</p>
		</div>
		<?php
	}

	public function update($new_instance, $old_instance)
	{
		$instance = array();
		$instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
		$instance['text'] = (!empty($new_instance['text'])) ? $new_instance['text'] : '';
		$instance['image'] = (!empty($new_instance['image'])) ? $new_instance['image'] : '';
		$instance['image_alignment'] = (!empty($new_instance['image_alignment'])) ? $new_instance['image_alignment'] : '';

		return $instance;
	}

}

$text_image_box = new Text_Image_Box();

class IDG_Carousel extends WP_Widget
{

	function __construct()
	{
		parent::__construct(
			'idg_carousel', // Base ID
			esc_html__('Carousel', 'idg-wp'), // Name
			array('description' => esc_html__('Banner management widget', 'idg-wp'),) // Args
		);

		// Register our Banners Widget
		add_action('widgets_init', function () {
			register_widget('IDG_Carousel');
		});

		add_action('admin_enqueue_scripts', array($this, 'idg_carousel_scripts'));
	}

	public function idg_carousel_scripts()
	{
		wp_enqueue_style('thickbox');
		wp_enqueue_script('thickbox');
		wp_enqueue_script('media-upload');
	}

	public function widget($args, $instance)
	{ ?>

		<div id="jumbotron-carousel" class="carousel slide carousel-fade" data-ride="carousel"
			 data-interval="5000">
			<div class="carousel-inner">
				<?php
				$n = $instance['number_of_banners'] ? intval($instance['number_of_banners']) : 1;
				for ($i = 0; $i < $n; $i++) : ?>
					<div class="carousel-item <?php echo $i == 0 ? 'active' : ''; ?>">
						<?php if( $instance['banner_with_no_text'][$i] ) : ?>
							<a href="<?php echo $instance['link_url'][$i]; ?>" <?php echo $instance['target'][$i] ? 'target="_blank"' : ''; ?>><?php echo $instance['link_title'][$i]; ?>
								<img class="d-block w-100" src="<?php echo wp_get_attachment_url($instance['image'][$i]); ?>" alt="Second slide">
							</a>
						<?php else: ?>
							<img class="d-block w-100" src="<?php echo wp_get_attachment_url($instance['image'][$i]); ?>" alt="Second slide">
							<div class="carousel-caption d-md-block">
								<div class="container">
									<h2>
										<a href="<?php echo $instance['link_url'][$i]; ?>" <?php echo $instance['target'][$i] ? 'target="_blank"' : ''; ?>><?php echo $instance['link_title'][$i]; ?></a>
									</h2>
									<p><?php echo $instance['desc'][$i]; ?></p>
								</div>
							</div>
						<?php endif; ?>
					</div>
				<?php endfor; ?>
			</div>
			<a class="carousel-control-prev" href="#jumbotron-carousel" role="button" data-slide="prev">
				<span class="carousel-control-prev-icon" aria-hidden="true"></span>
				<span class="sr-only">Previous</span>
			</a>
			<a class="carousel-control-next" href="#jumbotron-carousel" role="button" data-slide="next">
				<span class="carousel-control-next-icon" aria-hidden="true"></span>
				<span class="sr-only">Next</span>
			</a>
			<ol class="carousel-indicators">
				<?php
				for ($indicators = 0; $indicators < $i; $indicators++) {
					$class = $indicators == 0 ? 'active' : '';
					echo '<li data-target="#jumbotron-carousel" data-slide-to="' . $indicators . '" class="' . $class . '"></li>';
				}
				?>
			</ol>
		</div>

		<?php
	}

	public function form($instance)
	{

		$title = '';
		if (!empty($instance['title'])) {
			$title = $instance['title'];
		}

		$description = '';
		if (!empty($instance['description'])) {
			$description = $instance['description'];
		}

		$number_of_banners = '';
		if (!empty($instance['number_of_banners'])) {
			$number_of_banners = $instance['number_of_banners'];
		}

		$link_url = '';
		if (!empty($instance['link_url'])) {
			$link_url = array_values($instance['link_url']);
		}

		$target = '';
		if (!empty($instance['target'])) {
			$target = $instance['target'];
		}

		$banner_with_no_text = '';
		if (!empty($instance['banner_with_no_text'])) {
			$banner_with_no_text = $instance['banner_with_no_text'];
		}

		$link_title = '';
		if (!empty($instance['link_title'])) {
			$link_title = array_values($instance['link_title']);
		}

		$desc = '';
		if (!empty($instance['desc'])) {
			$desc = array_values($instance['desc']);
		}

		$order = '';
		if (isset($instance['order'])) {
			$order = array_values($instance['order']);
		}

		$image = '';
		if (isset($instance['image'])) {
			$image = array_values($instance['image']);
		}

		?>
		<div class="idg-banners-widget">

			<!--<p>
				<label for="<?php /*echo $this->get_field_name('title'); */
			?>"><?php /*_e('Title:', 'idg-wp'); */
			?></label>
				<input class="widefat" id="<?php /*echo $this->get_field_id('title'); */
			?>"
					   name="<?php /*echo $this->get_field_name('title'); */
			?>" type="text"
					   value="<?php /*echo esc_attr($title); */
			?>"/>
			</p>

			<p>
				<label
					for="<?php /*echo $this->get_field_name('description'); */
			?>"><?php /*_e('Description:', 'idg-wp'); */
			?></label>
				<textarea class="widefat" id="<?php /*echo $this->get_field_id('description'); */
			?>"
						  name="<?php /*echo $this->get_field_name('description'); */
			?>"
						  type="text"><?php /*echo esc_attr($description); */
			?></textarea>
			</p>-->

			<p>
				<label
					for="<?php echo $this->get_field_name('number_of_banners'); ?>"><?php _e('Quantity of items:', 'idg-wp'); ?></label>
				<input class="widefat number-of-banners-input"
					   id="<?php echo $this->get_field_id('number_of_banners'); ?>"
					   name="<?php echo $this->get_field_name('number_of_banners'); ?>" type="number" min="1"
					   value="<?php echo $number_of_banners ? esc_attr($number_of_banners) : '1'; ?>"/>
			</p>

			<div class="banners-items">
				<?php
				$n = $number_of_banners ? intval($number_of_banners) : 1;
				for ($i = 0; $i < $n; $i++) : ?>
					<div class="banner">
						<p><b>Slide #<?php echo($i + 1); ?></b> <a href="#" class="remove-banner-item">Excluir</a></p>
						<p>
							<label
								for="<?php echo $this->get_field_name('link_url') . '[' . $i . ']'; ?>"><?php _e('Link URL:'); ?></label>
							<input class="widefat" id="<?php echo $this->get_field_id('link_url') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('link_url') . '[' . $i . ']'; ?>" type="text"
								   value="<?php echo esc_attr($link_url[$i]); ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_id('target') . '[' . $i . ']'; ?>"><?php esc_attr_e('Open in new window:', 'idg-wp'); ?></label>
							<input class="card-target"
								   id="<?php echo $this->get_field_id('target') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('target') . '[' . $i . ']'; ?>"
								   type="checkbox" value="1" <?php checked('1', $target [$i], true); ?>>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_id('banner_with_no_text') . '[' . $i . ']'; ?>"><?php esc_attr_e('Banner without text:', 'idg-wp'); ?></label>
							<input id="<?php echo $this->get_field_id('banner_with_no_text') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('banner_with_no_text') . '[' . $i . ']'; ?>"
								   type="checkbox" value="1" <?php checked('1', $banner_with_no_text [$i], true); ?>>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('link_title') . '[' . $i . ']'; ?>"><?php _e('Link Title:'); ?></label>
							<input class="widefat"
								   id="<?php echo $this->get_field_id('link_title') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('link_title') . '[' . $i . ']'; ?>"
								   type="text" value="<?php echo esc_attr($link_title[$i]); ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('desc') . '[' . $i . ']'; ?>"><?php _e('Description:'); ?></label>
							<textarea class="widefat"
									  id="<?php echo $this->get_field_id('desc') . '[' . $i . ']'; ?>"
									  name="<?php echo $this->get_field_name('desc') . '[' . $i . ']'; ?>"><?php echo esc_attr($desc[$i]); ?></textarea>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('order') . '[' . $i . ']'; ?>"><?php _e('Order:'); ?></label>
							<input class="widefat" id="<?php echo $this->get_field_id('order') . '[' . $i . ']'; ?>"
								   name="<?php echo $this->get_field_name('order') . '[' . $i . ']'; ?>" type="number"
								   min="1" value="<?php echo $order[$i] ? esc_attr($order[$i]) : '1'; ?>"/>
						</p>

						<p>
							<label
								for="<?php echo $this->get_field_name('image') . '[' . $i . ']'; ?>"><?php _e('Image:', 'idg-wp'); ?></label>
							<img class="banner-img-preview" src="<?php echo wp_get_attachment_url($image[$i]); ?> ">
							<input name="<?php echo $this->get_field_name('image') . '[' . $i . ']'; ?>"
								   id="<?php echo $this->get_field_id('image') . '[' . $i . ']'; ?>"
								   class="widefat hidden" type="text" value="<?php echo $image[$i]; ?>"/>
							<input id="upload_image_button_<?php echo $i; ?>" class="upload_image_button" type="button"
								   value="<?php _e('Upload image', 'idg-wp'); ?>"/>
						</p>
					</div>
				<?php endfor; ?>
			</div>

		</div>

		<?php
	}

	public function update($new_instance, $old_instance)
	{
		$instance = array();
		$instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
		$instance['description'] = (!empty($new_instance['description'])) ? sanitize_text_field($new_instance['description']) : '';
		$instance['number_of_banners'] = (!empty($new_instance['number_of_banners'])) ? sanitize_text_field($new_instance['number_of_banners']) : '';
		$instance['link_url'] = (!empty($new_instance['link_url'])) ? $new_instance['link_url'] : '';
		$instance['target'] = (!empty($new_instance['target'])) ? $new_instance['target'] : '';
		$instance['banner_with_no_text'] = (!empty($new_instance['banner_with_no_text'])) ? $new_instance['banner_with_no_text'] : '';
		$instance['link_title'] = (!empty($new_instance['link_title'])) ? $new_instance['link_title'] : '';
		$instance['desc'] = (!empty($new_instance['desc'])) ? $new_instance['desc'] : '';
		$instance['order'] = (!empty($new_instance['order'])) ? $new_instance['order'] : '';
		$instance['image'] = (!empty($new_instance['image'])) ? $new_instance['image'] : '';

		return $instance;
	}

}

$idg_carousel = new IDG_Carousel();
