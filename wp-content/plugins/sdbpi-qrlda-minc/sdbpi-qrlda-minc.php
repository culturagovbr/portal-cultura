<?php
/**
 * Plugin Name:       Questionario
 * Plugin URI:        https://github.com/culturagovbr/
 * Description:       @TODO
 * Version:           1.0.0
 * Author:            Pedro Dias
 * Author URI:        https://github.com/darciro/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

if (!class_exists('SdbpiQrlda')) :/**sdbpi-qrlda sdbpi_qrlda*/

    class SdbpiQrlda
    {
        public function __construct()
        {
            register_activation_hook(__FILE__, array($this, 'activate_proposta_lda_2019_sdbpi'));
            add_action('init', array($this, 'proposta_lda_2019_sdbpi'));
            add_filter('manage_proposta_lda_2019_posts_columns', array($this, 'add_proposta_lda_2019_columns'));
            add_action('manage_posts_custom_column', array($this, 'proposta_lda_2019_custom_columns'), 10, 2);
            add_action('wp_enqueue_scripts', array($this, 'register_plugin_styles'));
            add_action('init', array($this, 'sdbpi_qrlda_shortcodes'));
            add_action('acf/pre_save_post', array($this, 'preprocess_main_form'));
            add_action('get_header', 'acf_form_head');
        }
        public function register_plugin_styles()
        {
            wp_register_style('a-style',plugin_dir_url(__FILE__) . 'assets/a-style.css');
            wp_enqueue_style('a-style');
        }

        /**
         * Fired during plugin activation, check for dependency
         *
         */
        public static function activate_proposta_lda_2019_sdbpi()
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
        public function proposta_lda_2019_sdbpi()
        {
            register_post_type('proposta_lda_2019', array(
                    'labels' => array(
                        'name' => 'Questionario  LDA 2019',
                        'singular_name' => 'Questionario  LDA 2019',
                        'add_new' => 'Nova proposta',
                        'add_new_item' => 'Nova proposta',
                    ),
                    'description' => 'Questionario reforma LDA 2019',
                    'public' => true,
                    'exclude_from_search' => true,
                    'publicly_queryable' => false,
                    'supports' => array('title'),
                    'menu_icon' => 'dashicons-clipboard')
            );
        }

        /**
         * Add new columns to our custom post type
         *
         * @param $columns
         * @return array
         */
        public function add_proposta_lda_2019_columns($columns)
        {
            unset($columns['author']);
            return array_merge($columns, array(
                'nome' => 'Nome',
                'email' => 'E-mail',
                'tel' => 'Telefone',
                'manifestacao' => 'Tipo de manifestação',
                'reforma' => 'Tipo reforma'
            ));
        }

        /**
         * Fill custom columns with data
         *
         * @param $column
         * @param $post_id
         */
        public function proposta_lda_2019_custom_columns($column, $post_id)
        {
            $post_author_id = get_post_field('post_author', $post_id);
            $post_author = get_user_by('id', $post_author_id);

            switch ($column) {
                case 'nome':
                    echo get_field('sdbpi_qrlda_');
                    break;
                case 'email':
                    echo get_field('sdbpi_qrlda_email');
                    break;
                case 'tel':
                    echo get_field('sdbpi_qrlda_telefone');
                    break;
                case 'manifestacao':
                    echo get_field('sdbpi_qrlda_tp_manifestacao');
                    break;
                case 'reforma':
                    echo get_field('sdbpi_qrlda_opiniao_necessaria');
                    break;
            }
        }

        /**
         * Shortcode to show ACF form
         *
         * @param $atts
         * @return string
         */
        public function sdbpi_qrlda_shortcodes($atts)
        {
            require_once plugin_dir_path( __FILE__ ) . 'inc/shortcodes.php';
            $sdbpi_qrlda_shortcodes = new Sdbpi_Qrlda_Shortcodes();
        }

        /**
         * Process data before save indication post
         *
         * @param $post_id
         * @return int|void|WP_Error
         */
        public function preprocess_main_form($post_id)
        {
            if ($post_id != 'new_proposta_lda_2019') {
                return $post_id;
            }
            if (is_admin()) {
                return;
            }

            $post = get_post($post_id);
            $post = array('post_type' => 'proposta_lda_2019', 'post_status' => 'publish');
            $post_id = wp_insert_post($post);

            $inscricao = array('ID' => $post_id, 'post_title' => 'Questionario - (ID #' . $post_id . ')');
            wp_update_post($inscricao);

            // Return the new ID
            return $post_id;
        }


    }

    // Initialize our plugin
    $oscar_minc = new SdbpiQrlda();

endif;