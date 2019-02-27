<?php

class IDGWP_Customize
{
	/**
	 * Identifier, namespace
	 */
	protected $theme_key = '';

	/**
	 * The option value in the database will be based on get_stylesheet()
	 * so child themes don't share the parent theme's option value.
	 */
	protected $option_key = '';

	/**
	 * Initialize
	 *
	 * @param null $args
	 */
	public function __construct($args = null)
	{
		// Set option key based on get_stylesheet()
		if (null === $args) {
			$args['theme_key'] = strtolower(get_stylesheet());
		}
		// Set option key based on get_stylesheet()
		$this->theme_key = $args['theme_key'];
		$this->option_key = $this->theme_key . '_theme_options';
		// register our custom settings
		add_action('customize_register', array($this, 'customize_register'));
		// Scripts for Preview
		add_action('customize_preview_init', array($this, 'customize_preview_js'));
	}

	/**
	 * Returns the default options.
	 * Use the hook 'documentation_default_theme_options' for change via plugin
	 *
	 * @since    08/09/2012
	 *
	 * @param null $value
	 *
	 * @return Array
	 */
	public function get_default_theme_options($value = null)
	{
		$default_theme_options = array(
			'echo_desc' => '1',
			'layout' => 'sidebar-right',
			'rewrite_url' => 'wp-admin/edit.php',
			'color_scheme' => 'light',
			'text_color' => '#111',
			'link_color' => '#0100BE'
		);
		if (null !== $value) {
			return $default_theme_options[$value];
		}

		return apply_filters($this->theme_key . '_default_theme_options', $default_theme_options);
	}

	/**
	 * Returns the options array.
	 *
	 * @since    08/09/2012
	 *
	 * @param null $value
	 *
	 * @return Array
	 */
	public function get_theme_options($value = null)
	{
		$saved = (array)get_option($this->option_key);
		$defaults = $this->get_default_theme_options();
		$options = wp_parse_args($saved, $defaults);
		$options = array_intersect_key($options, $defaults);
		$options = apply_filters($this->theme_key . '_theme_options', $options);
		if (null !== $value) {
			return $options[$value];
		}

		return $options;
	}

	/**
	 * Implement theme options into Theme Customizer on Frontend
	 *
	 * @see     examples for different input fields https://gist.github.com/2968549
	 * @since   08/09/2012
	 *
	 * @param   $wp_customize  Theme Customizer object
	 *
	 * @return  void
	 */
	public function customize_register($wp_customize)
	{

		$defaults = $this->get_default_theme_options();

		// Remove unnecessary items
		$wp_customize->remove_section('header_image');
		$wp_customize->remove_control('show_on_front');

		// defaults, import for live preview with js helper
		$wp_customize->get_setting('blogname')->transport = 'postMessage';
		$wp_customize->get_setting('blogdescription')->transport = 'postMessage';

		// Changes default items
		$wp_customize->add_section('static_front_page', array(
			'title' => __('Front page settings', 'idg-wp'),
			'priority' => 120,
			'description' => __('Here you can find options to changes the look and feel for front page.', 'idg-wp'),
		));

		// TODO
		$wp_customize->add_setting($this->option_key . '_main_carousel', array(
			'default' => $defaults['_main_carousel'],
			'type' => 'option',
			'capability' => 'edit_theme_options',
			'transport' => 'postMessage',
		));

		$post_categories = get_categories();
		$cats = [];
		foreach ($post_categories as $category) {
			$cats[$category->slug] = $category->name;
		}

		$wp_customize->add_control($this->option_key . '_main_carousel', array(
			'label' => esc_attr__('Main carousel categories', 'idg-wp'),
			'section' => 'static_front_page',
			'settings' => $this->option_key . '_main_carousel',
			'type' => 'select',
			'choices' => $cats,
		));

		$wp_customize->selective_refresh->add_partial($this->option_key . '_main_carousel', array(
			'selector' => '#jumbotron-carousel',
			// 'render_callback' =>  array( $this, 'idg_wp_customize_partial_main_carousel' ),
		));

		$wp_customize->add_setting($this->option_key . '_main_carousel_slides', array(
			'default' => $defaults['_main_carousel_slides'],
			'type' => 'option',
			'capability' => 'edit_theme_options',
			'transport' => 'postMessage',
		));

		$wp_customize->add_control($this->option_key . '_main_carousel_slides', array(
			'label' => esc_attr__('Number of slides to show', 'idg-wp'),
			'section' => 'static_front_page',
			'settings' => $this->option_key . '_main_carousel_slides',
			'type' => 'number'
		));

		$wp_customize->selective_refresh->add_partial($this->option_key . '_main_carousel_slides', array(
			'selector' => '#jumbotron-carousel',
		));

		// TODO
		$wp_customize->add_setting($this->option_key . '_news_sections', array(
			'default' => $defaults['_news_sections'],
			'type' => 'option',
			'capability' => 'edit_theme_options',
			'transport' => 'postMessage',
		));

		$wp_customize->add_control($this->option_key . '_news_sections', array(
			'label' => esc_attr__('News sections category', 'idg-wp'),
			'section' => 'static_front_page',
			'settings' => $this->option_key . '_news_sections',
			'type' => 'select',
			'choices' => $cats,
		));

		$wp_customize->selective_refresh->add_partial($this->option_key . '_news_sections', array(
			'selector' => '#noticias',
		));

		$wp_customize->add_setting($this->option_key . '_news_sections_items', array(
			'default' => $defaults['_news_sections_items'],
			'type' => 'option',
			'capability' => 'edit_theme_options',
			'transport' => 'postMessage',
		));

		$wp_customize->add_control($this->option_key . '_news_sections_items', array(
			'label' => esc_attr__('Number of items to show', 'idg-wp'),
			'section' => 'static_front_page',
			'settings' => $this->option_key . '_news_sections_items',
			'type' => 'number'
		));

		$wp_customize->selective_refresh->add_partial($this->option_key . '_news_sections_items', array(
			'selector' => '#noticias',
		));

		$wp_customize->add_setting($this->option_key . '_home_widgets_sections', array(
			'default' => '',
			'type' => 'option',
			'capability' => 'edit_theme_options',
			'transport' => 'postMessage',
			'sanitize_callback' => 'sanitize_text_field',
		));

		$wp_customize->add_control(new Sidebar_Dropdown_Custom_Control($wp_customize, $this->option_key . '_home_widgets_sections', array(
			'type' => 'textarea',
			'label' => esc_html__('Front page sections', 'idg-wp'),
			'description' => esc_html__('Choose a section on the list available below, and rearrange as you please.', 'mytheme'),
			'settings' => $this->option_key . '_home_widgets_sections',
			'section' => 'static_front_page',
		)));


		$wp_customize->selective_refresh->add_partial($this->option_key . '_home_widgets_sections', array(
			'selector' => '#main',
		));

		$wp_customize->add_setting($this->option_key . '_home_widgets_sections_disable', array(
			'default' => false,
			'type' => 'option',
			'capability' => 'edit_theme_options',
		));

		$wp_customize->add_control($this->option_key . '_home_widgets_sections_disable', array(
			'label' => esc_attr__('Disable dynamic sections in front page, let the active theme decide what to do.', 'idg-wp'),
			'section' => 'static_front_page',
			'settings' => $this->option_key . '_home_widgets_sections_disable',
			'type' => 'checkbox'
		));
	}

	/**
	 * Mp reload for changes
	 *
	 * @since    10/02/2012
	 * @return   void
	 */
	public function customize_preview_js()
	{
		// $suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '.dev' : '';
		wp_register_script(
			$this->theme_key . '-customizer',
			// get_template_directory_uri() . '/js/theme-customizer' . $suffix . '.js',
			get_template_directory_uri() . '/assets/js/dist/idg-wp-customizer.min.js',
			array('customize-preview'),
			false,
			true
		);
		wp_enqueue_script($this->theme_key . '-customizer');

		wp_localize_script($this->theme_key . '-customizer', 'idgCustomizer', array(
				'ajaxurl' => admin_url('admin-ajax.php')
			)
		);
	}

} // end class
$documentation_customize = new IDGWP_Customize();

if (is_customize_preview()) :
	class Sidebar_Dropdown_Custom_Control extends WP_Customize_Control
	{
		public function render_content()
		{ ?>
			<label class="customize_dropdown_input">

				<?php
				$theme_key = strtolower(get_stylesheet());
				$option_key = $theme_key . '_theme_options';
				$home_widgets_sections = get_option($option_key . '_home_widgets_sections');
				?>

				<span class="customize-control-title"><?php echo esc_html($this->label); ?></span>
				<p><?php echo wp_kses_post($this->description); ?></p>

				<?php global $wp_registered_sidebars; ?>

				<select id="idg-wp-home-widgets-sections-selector">
					<?php
					foreach ($wp_registered_sidebars as $sidebar) {
						echo '<option value="' . $sidebar['id'] . '">' . $sidebar['name'] . '</option>';
					}
					?>
				</select>

				<p id="idg-wp-add-home-widgets-sections-holder">
					<a href="#" id="idg-wp-add-home-widgets-sections">Add a section</a>
				</p>

				<textarea id="idg-wp-home-widgets-sections-selected" name="<?php echo esc_attr($this->id); ?>"
						  data-customize-setting-link="<?php echo esc_attr($this->id); ?>"
						  style="width: 100%"><?php echo $this->value(); ?></textarea>

				<ol id="idg-wp-home-widgets-sections-sortable">
					<?php
					if ($home_widgets_sections) {
						foreach (explode(',', $home_widgets_sections) as $home_widgets_section) {
							echo '<li id="' . $home_widgets_section . '">' . $wp_registered_sidebars[$home_widgets_section]['name'] . ' <a href="#" class="dashicons dashicons-trash"></a></li>';
						}
					}
					?>
				</ol>
			</label>
			<?php
		}
	}
endif;
