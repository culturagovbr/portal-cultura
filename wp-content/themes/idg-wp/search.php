<?php
/**
 * The template for displaying search results pages
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#search-result
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();

global $query_string, $wp_query;
wp_parse_str( $query_string, $search_query );
$filter_active = false;

if( !empty( $_GET['type'] ) ) {
	$search_query['post_type'] = $_GET['type'];
	$filter_active = true;
}

if( !empty( $_GET['period'] ) ) {
	$today = getdate();
	switch ( $_GET['period'] ) {
		case 'week':
			$search_query['w'] = date('W');
			break;
		case 'month':
			$search_query['monthnum'] = $today['mon'];
			break;
		case 'year':
			$search_query['year'] = $today['year'];
			break;
		default:
	}
	$search_query['post_type'] = $_GET['type'];
	$filter_active = true;
}

$wp_query = new WP_Query( $search_query );
?>

	<main id="main" class="site-main">
		<div class="container">
			<?php the_breadcrumb (); ?>

			<div id="content" class="row">
				<div class="col-12">

					<h1 class="page-title text-center">Busca</h1>

					<div class="search-content-wrapper">
						<form class="search-content" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) );?>">
							<div class="input-wrapper">
								<input type="search" placeholder="Buscar" value="<?php echo get_query_var('s'); ?>" name="s"/>
								<button type="submit" class="search"><i class="icon-search"></i></button>
								<button type="button" class="filter" data-toggle="collapse" href="#filter-wrapper-collapser" role="button" aria-expanded="false" aria-controls="filter-wrapper-collapser">Filtrar</button>
							</div>

							<div id="filter-wrapper-collapser" class="filter-wrapper collapse <?php echo $filter_active ? 'show' : '';?>">

								<div class="row">
									<div class="col-6">
										<h3 class="text-left mb-4">Tipo de conteúdo</h3>

										<label><input type="checkbox" name="type[]" value="event" <?php echo in_array( 'event', $_GET['type'] ) ? 'checked' : ''; ?>/> Agenda</label>
										<label><input type="checkbox" name="type[]" value="documentos" <?php echo in_array( 'documentos', $_GET['type'] ) ? 'checked' : ''; ?>/> Documentos</label>
										<label><input type="checkbox" name="type[]" value="multimedia" <?php echo in_array( 'multimedia', $_GET['type'] ) ? 'checked' : ''; ?>/> Multimídia</label>
										<label><input type="checkbox" name="type[]" value="post" <?php echo in_array( 'post', $_GET['type'] ) ? 'checked' : ''; ?>/> Notícia</label>
										<label><input type="checkbox" name="type[]" value="page" <?php echo in_array( 'page', $_GET['type'] ) ? 'checked' : ''; ?>/> Página</label>

									</div>
									<div class="col-6">
										<h3 class="text-left mb-4">Período</h3>

										<label><input type="radio" name="period" value="any" <?php echo $_GET['period'] == 'any' ? 'checked' : ''; ?>/> Qualquer período</label>
										<label><input type="radio" name="period" value="week" <?php echo $_GET['period'] == 'week' ? 'checked' : ''; ?>/> Últimos 7 dias</label>
										<label><input type="radio" name="period" value="month" <?php echo $_GET['period'] == 'month' ? 'checked' : ''; ?>/> Últimos 30 dias</label>
										<label><input type="radio" name="period" value="year" <?php echo $_GET['period'] == 'year' ? 'checked' : ''; ?>/> Últimos 12 meses</label>
									</div>
								</div>

								<div class="row">
									<div class="col-12">
										<button type="submit" class="apply">Aplicar</button>
									</div>
								</div>
							</div>
						</form>
					</div>

					<div class="row">
						<div class="col-12">
							<h3 class="text-center"><b><?php echo $wp_query->found_posts; ?></b> itens atendem ao seu critério.</h3>
						</div>
					</div>

					<?php get_template_part( 'template-parts/posts-list', 'search' ); ?>

					<?php get_template_part( 'template-parts/copyright' ); ?>
				</div>
			</div>
		</div>
	</main>

<?php
get_footer();
