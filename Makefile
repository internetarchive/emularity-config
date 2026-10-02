.PHONY: lint

lint:
	@if [ -z "$$DYNODIR" ]; then \
		echo "Error: DYNODIR is not set" >&2; \
		exit 1; \
	fi
	$$DYNODIR/lint loader.js
