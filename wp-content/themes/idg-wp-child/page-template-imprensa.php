<?php /* Template Name: Imprensa */ ?>

<?php get_header(); ?>

<main id="page-imprensa" class="site-main">
	<div class="container">
		<div class="row">
			<?php the_breadcrumb(); ?>
		</div>

		<?php wp_reset_postdata(); ?>

	</div>

	<div id="content">
		<div class="container">
			<header class="entry-header">
				<h1 class="entry-title text-center"><?php the_title(); ?></h1>
			</header>
		</div>
	</div>

	<div id="contact">
		<div class="container">
			<div class="row">
				<div class="col text-wrapper">
					<?php the_content(); ?>
				</div>

				<div class="col form-wrapper">
					<?php echo do_shortcode('[contact-form-7 id="47" title="Contato"]'); ?>
				</div>
			</div>
		</div>
	</div>

	<section class="image-and-text bg-grey-2">

		<div class="container image-left align-center">
			<div class="col-image text-center">
				<div class="box">
					<div class="img-wrapper mb-3">
						<img src="<?php echo get_template_directory_uri(); ?>/assets/img/sefic.png" />
					</div>

					<h3>Secretaria de Fomento e Incentivo à Cultura</h3>
				</div>
			</div>

			<div class="col-text">
				<p>Responsável pela gestão do Programa Nacional de Apoio à Cultura (Pronac)</p>
				<p><strong>Endereço:</strong> Esplanada dos Ministérios, Bloco B, 1º andar </p>
				<p><strong>CEP:</strong> 70068-900 – Brasília/DF</p><br/>

				<p>Contato Gabinete do Secretário</p>
				<p><strong>Fone: </strong><a href="tel:+556120242113">(61) 2024-2113</a> ou <a href="tel:+556120242114">2024-2114 </a></p><br/>

				<p>Contato Departamento de Fomento Indireto </p>
				<p>(informações sobre projetos culturais e agendamento para atendimento presencial)</p>
				<p><strong>Fone:</strong> <a href="tel:+556120242368">(61) 2024-2368</a></p>
			</div>
		</div>
	</section>

	<section class="image-and-text">

		<div class="container image-left align-center">
			<div class="col-image text-center">
				<div class="box">
					<div class="img-wrapper mb-3">
						<img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo-ouvidoria_500px.png" />
					</div>
				</div>
			</div>

			<div class="col-text">
				<p>Reclamações, sugestões, elogios, denúncias ou solicitação de informações pode ser encaminhados pela Ouvidoria.</p>
				<p><strong>Acesse:</strong> <a href="http://ouvidoria.cultura.gov.br/ouvidoria/login.jsp" target="_blank">aqui</a>.</p>
				<p><strong>Fone:</strong> <a href= "tel:+55612024224">(61) 2024-2245</a>.</p>

			</div>
		</div>
	</section>
</main>

<?php get_footer(); ?>


