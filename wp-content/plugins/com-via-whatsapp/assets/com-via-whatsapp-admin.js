(function($) {
    $(document).ready(function() {
        admin.init();
    });

    var admin = {
        init: function() {
	        if( $("#com-via-whatsapp-table").length ){

		        TableExport.prototype.formatConfig.xlsx.buttonContent = "Exportar para xlsx";
		        TableExport.prototype.formatConfig.xlsx.defaultClass = "button button-primary";
		        TableExport.prototype.formatConfig.xls.buttonContent = "Exportar para xls";
		        TableExport.prototype.formatConfig.xls.defaultClass = "button button-primary";
		        TableExport.prototype.formatConfig.csv.buttonContent = "Exportar para csv";
		        TableExport.prototype.formatConfig.csv.defaultClass = "button button-primary";
		        TableExport.prototype.formatConfig.txt.buttonContent = "Exportar para txt";
		        TableExport.prototype.formatConfig.txt.defaultClass = "button button-primary";

		        $file_name = 'comunicados-via-whatsapp';
		        $sheet_name = 'Cadastro';
		        $("#com-via-whatsapp-table").tableExport({
			        headers: true,                          // (Boolean), display table headers (th or td elements) in the <thead>, (default: true)
			        footers: true,                          // (Boolean), display table footers (th or td elements) in the <tfoot>, (default: false)
			        formats: ['xlsx', 'xls', 'csv', 'txt'], // (String[]), filetype(s) for the export, (default: ['xlsx', 'csv', 'txt'])
			        filename: $file_name,                  // (id, String), filename for the downloaded file, (default: 'id')
			        bootstrap: true,                        // (Boolean), style buttons using bootstrap, (default: true)
			        exportButtons: true,                    // (Boolean), automatically generate the built-in export buttons for each of the specified formats (default: true)
			        position: "top",                        // (top, bottom), position of the caption element relative to table, (default: 'bottom')
			        ignoreRows: null,                       // (Number, Number[]), row indices to exclude from the exported file(s) (default: null)
			        ignoreCols: null,                       // (Number, Number[]), column indices to exclude from the exported file(s) (default: null)
			        trimWhitespace: false,                  // (Boolean), remove all leading/trailing newlines, spaces, and tabs from cell text in the exported file(s) (default: false)
			        RTL: false,                             // (Boolean), set direction of the worksheet to right-to-left (default: false)
		        });
            }

        }
    };
})(jQuery);