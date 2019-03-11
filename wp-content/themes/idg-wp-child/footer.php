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

<?php /*
<!-- Start of Rocket.Chat Livechat Script -->
<script type="text/javascript">
	(function(w, d, s, u) {
		w.RocketChat = function(c) { w.RocketChat._.push(c) }; w.RocketChat._ = []; w.RocketChat.url = u;
		var h = d.getElementsByTagName(s)[0], j = d.createElement(s);
		j.async = true; j.src = 'https://lappis.cultura.gov.br/packages/rocketchat_livechat/assets/rocketchat-livechat.min.js?_=201702160944';
		h.parentNode.insertBefore(j, h);
	})(window, document, 'script', 'https://lappis.cultura.gov.br/livechat');
</script>
<!-- End of Rocket.Chat Livechat Script -->
*/ ?>

</body>
</html>
