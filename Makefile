
DEST = /usr/bin/mint

install: vendor/optparse-js/lib
	ln -sf $(shell pwd)/bin/mint $(DEST)

uninstall: $(DEST)
	unlink $(DEST)

vendor/optparse-js/lib: 
	git submodule update --init

.PHONY: install uninstall