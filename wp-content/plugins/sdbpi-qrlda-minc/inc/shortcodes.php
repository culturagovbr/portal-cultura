<?php

/**
 * Class Sdbpi_Qrlda_Shortcodes
 *
 */
class Sdbpi_Qrlda_Shortcodes
{

    public function __construct()
    {       
       add_shortcode('proposta_lda_2019_sdbpi', array($this,'proposta_lda_2019_sdbpi_form_shortcode'));
       add_shortcode('proposta_lda_2019_mensage', array($this, 'proposta_lda_2019_mensage'));
    }

    /**
     * Shortcode to show ACF form
     *
     * @param $atts
     * @return string
     */

    public function proposta_lda_2019_sdbpi_form_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'form-group-id' => '',
            'return' => '/outro-teste/?updated=true'
        ), $atts);

        ob_start();
        $post_proposta_lda_2019 = empty($_GET['proposta_lda_2019']) ? 'new_proposta_lda_2019' : $_GET['proposta_lda_2019'];

        $settings = array(
            'field_groups' => array($atts['form-group-id']),
            'id' => 'proposta_lda_2019-form',
            'post_id' => $post_proposta_lda_2019,
            'new_post' => array(
                'post_type' => 'proposta_lda_2019',
                'post_status' => 'publish'
            ),
            'updated_message' => 'Questionario enviado com sucesso.',
            'return' => $atts['return'],
            'submit_value' => 'Salvar dados'
        );
        acf_form($settings);

        return ob_get_clean();
    }
    public function proposta_lda_2019_mensage($atts)
    {
       if(isset($_GET['updated']) && $_GET['updated']=='true'):
         echo '<script>alert(\'Cadastro realizado com sucesso\')</script>';
        endif;
    }
}