publish-docs:
	mkdir -p ../dl-api-javascript-docs
	grunt yuidoc
	git init ../dl-api-javascript-docs
	cd ../dl-api-javascript-docs && git remote add origin git@github.com:doubleleft/dl-api-javascript.git && git checkout -b gh-pages && git add .  && git commit -m "update public documentation" && git push origin gh-pages -f
