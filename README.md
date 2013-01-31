webnode
=======

RESTful Web Service framework on top of Restify

Directory tree

	./index.js			--- Application boot script
	./app				--- Main source directory
		controller/		--- Controllers directory
		model/			--- Model directory
	./config			---	Configuration directory
		router.js		--- Router config
		development.js	--- ENV config for development
		production.js	--- ENV config for production
		test.js			--- ENV config for test
	./data				--- data storage directory, must be writable
		log				--- log directory
		tmp				--- tmp directory
	./lib				--- common library
	./test				--- unit test cases directory