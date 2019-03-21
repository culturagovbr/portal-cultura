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

		<div class="container image-left">
			<div class="col-image text-center">
				<div class="box">
					<div class="img-wrapper mb-3">
						<img src="<?php echo get_template_directory_uri(); ?>/assets/img/sefic.png" />
					</div>

					<h3>Secretaria de Fomento e Incentivo à Cultura</h3>
					<p>Responsável, entre outras atividades, pela gestão dos processos submetidos ao mecanismo de Incentivo Fiscal da Lei Rouanet</p>
				</div>
			</div>

			<div class="col-text">
				<strong>Coordenação-Geral de Admissibilidade e Aprovação (SEFIC)</strong>
				<p>É responsável pela admissibilidade, ou seja, a entrada do projeto cultural que pretende efetivar captação de recursos por meio do mecanismo de incentivo fiscal. Analisa a proposta cultural, atribui número de PRONAC, envia o projeto à análise técnica, inclui na pauta da Reunião da Comissão Nacional de Incentivo à Cultura (CNIC), confere documentação e encaminha para publicação de resultado.</p>

				<p>Informações complementares e esclarecimentos de dúvidas afetas ao projeto cultural, poderão ser encaminhados por meio da funcionalidade “Minhas Solicitações” no Salic, sendo que as orientações para utilizá-la encontram-se no Portal da Rouanet, <a href="http://rouanet.cultura.gov.br">http://rouanet.cultura.gov.br</a> , no menu “Tutoriais”. Telefone: <a href="tel:+556120242060" target="_blank">2024-2060</a>.</p>

				<strong>Coordenação-Geral de Execução e Fiscalização (SEFIC)</strong>
				<p>É responsável pelo monitoramento da execução do projeto cultural, envolvendo abertura das contas, movimentações financeiras, ajustes diversos e vistorias in loco.</p>

				<p>Informações complementares e esclarecimentos de dúvidas afetas ao projeto cultural, poderão ser encaminhados por meio da funcionalidade “Minhas Solicitações” no Salic, sendo que as orientações para utilizá-la encontram-se no Portal da Rouanet, <a href="http://rouanet.cultura.gov.br">http://rouanet.cultura.gov.br</a> , no menu “Tutoriais”. Telefone: <a href="tel:+556120242040" target="_blank">2024-2040</a>.</p>

				<strong>Coordenação-Geral de Avaliação de Resultado (SEFIC)</strong>
				<p>É responsável pela análise do cumprimento do objeto e avaliação financeira da prestação de contas, envio de diligências, a elaboração de relatórios técnico-financeiros e outros procedimentos.</p>

				<p>Informações complementares e esclarecimentos de dúvidas afetas ao projeto cultural, poderão ser encaminhados por meio da funcionalidade “Minhas Solicitações” no Salic, sendo que as orientações para utilizá-la encontram-se no Portal da Rouanet, <a href="http://rouanet.cultura.gov.br">http://rouanet.cultura.gov.br</a> , no menu “Tutoriais”. Telefone: <a href="tel:+556120242090">2024-2090</a>.</p>

				<hr/>

				<p><strong>Endereço:</strong> Esplanada dos Ministérios, Bloco B, 1º andar </p>
				<p><strong>CEP:</strong> 70068-900 – Brasília/DF</p>
				<p><strong>Fone:</strong> +55 <a href="tel:+556120242113">61 2024-2113</a></p>
			</div>
		</div>
	</section>

	<section class="image-and-text">

		<div class="container image-left">
			<div class="col-image text-center">
				<div class="box">
					<div class="img-wrapper mb-3">
						<img src="<?php echo get_template_directory_uri(); ?>/assets/img/logo-ouvidoria_500px.png" />
					</div>

					<p>Responsável por examinar e encaminhar as reclamações, sugestões, elogios, denúncias e solicitação de informações, especialmente aquelas que demandam maior urgência</p>
				</div>
			</div>

			<div class="col-text">
				<p>A Ouvidoria do Ministério da Cultura é uma unidade diretamente ligada ao Gabinete do dirigente máximo da instituição. Trata-se de um canal de comunicação com o cidadão e instrumento de participação e exercício de cidadania. Possui modalidade de controle social, de defesa de direitos e também uma importante ferramenta qualificadora da gestão pública.</p>

				<p>Para acessar: <a href="http://ouvidoria.cultura.gov.br/ouvidoria/login.jsp" target="_blank">http://ouvidoria.cultura.gov.br/ouvidoria/login.jsp</a></p>

				<p>Atendimento por telefone: (61) 2024-2245</p>
			</div>
		</div>
	</section>
</main>

<?php get_footer(); ?>


