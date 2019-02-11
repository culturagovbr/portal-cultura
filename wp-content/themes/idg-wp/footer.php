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
				<div class="col-lg-12">
					<h3 class="social-title text-uppercase">Redes sociais</h3>

					<ul class="social-medias">
						<li class="twitter">
							<a href="https://twitter.com/CulturaGovBR" target="_blank">Twitter</a>
						</li>
						<li class="youtube">
							<a href="http://youtube.com/user/ministeriodacultura" target="_blank">Youtube</a>
						</li>
						<li class="facebook">
							<a href="https://www.facebook.com/SecretariaEspecialDaCultura/" target="_blank">Facebook</a>
						</li>
						<li class="flickr">
							<a href="http://flickr.com/photos/ministeriodacultura/" target="_blank">Flickr</a>
						</li>
						<li class="instagram">
							<a href="http://instagram.com/culturagovbr" target="_blank">Instagram</a>
						</li>
						<li class="soundcloud">
							<a href="https://soundcloud.com/mincidadania" target="_blank">Soundcloud</a>
						</li>
					</ul>
				</div>
			</div>
			<div class="row menus">
				<?php if ( is_active_sidebar( 'footer-widgets-area' ) ) :
					dynamic_sidebar( 'footer-widgets-area' );
				endif; ?>
			</div>
			<div class="row footer-brasil">
				<div class="col-lg-12">
					<a class="logo-acesso-footer" target="_blank" href="http://www.acessoainformacao.gov.br/" alt="Acesso à informação" title="Acesso à informação"></a>
				</div>
			</div>
		</div>
	</footer>

<?php wp_footer(); ?>

</body>
</html>
