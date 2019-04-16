Identidade Digital do Governo - Extensão da API
===  
Este plugin WordPress, pretende extender a API padrão do WordPress permitindo mais facilidade de integração para com as notícias do portal institucional, limitando os dados retornados e adicionando novos argumentos para a filtragem dos dados.

Utilização  
---------------  
Para retornar uma lista no formato [JSON](https://www.json.org/), basta utilizar uma requisição do tipo GET no seguinte endereço:
```sh
[wp_home_url]/wp-json/idg-wp/v1/posts
```
onde [wp_home_url] representa a URL padrão do site.

### Argumentos aceitos: 

| Nome | Tipo | Descrição | 
| ------ | ------ | ------ |
| **s** | *string* | Mostrar postagens com base em uma pesquisa de palavras-chave. Padrão: *null* |
| **category_name** | *string* | Mostrar postagens associadas a determinada categoria. Padrão: *null* |
| **posts_per_page** | *string* | Quantidade de itens retornados numa determinada requisição. Padrão: *10* |
| **offset** | *integer* | Quantidade de itens para serem "pulados" desde o primeiro item. Padrão: *null* |
| **paged** | *integer* | Número da página a ser requisitado. Padrão: *1* |
| **post_count** | *bool* | Traz a contagem de postagens resultantes da requisição. Padrão: *false* |
| **found_posts** | *bool* | Traz a contagem total de postagens resultantes da requisição. Padrão: *false* |
| **max_num_pages** | *bool* | Traz o número de páginas do resultado. Padrão: *false* |

Exemplo de uma requisição, buscando pela palavra-chave "jogos", com apenas 3 resultados e evitando o primeiro item da lista.

```sh
[wp_home_url]/wp-json/idg-wp/v1/posts?s=jogos&posts_per_page=3&offset=1
```