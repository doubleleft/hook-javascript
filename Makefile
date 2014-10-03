publish-docs:
	mkdir -p ../hook-javascript-docs
	grunt yuidoc
	git init ../hook-javascript-docs
	cd ../hook-javascript-docs && git remote add origin git@github.com:doubleleft/hook-javascript.git && git checkout -b gh-pages && git add .  && git commit -m "update public documentation" && git push origin gh-pages -f
