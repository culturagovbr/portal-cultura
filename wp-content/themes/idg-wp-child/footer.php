<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>
  <footer id="main-footer">
    <div class="container">
      <div class="row">


        <div class="menus col-lg-6">
          <?php if ( is_active_sidebar( 'footer-widgets-area' ) ) :
            dynamic_sidebar( 'footer-widgets-area' );
          endif; ?>
        </div>

        <div class="col-lg-6">
          <h3 class="social-title text-uppercase">Redes sociais</h3>

          <?php get_template_part( 'template-parts/social-medias' ); ?>
        </div>
      </div>
      <div class="row footer-brasil">
        <div class="col-lg-12">
          <a class="logo-acesso-footer" target="_blank" href="http://www.acessoainformacao.gov.br/" alt="Acesso à informação" title="Acesso à informação"></a>
        </div>
      </div>
    </div>
  </footer>

  <div id="overlay"></div>

<?php wp_footer(); ?>

</body>
</html>
