import sys
import json


def getConfigs():
    with open('parse.json') as configs:
        return = json.load(configs)
        


config = getConfigs()

def controllerToFile(controller):
    controllerMap = config['codeFileMap']

    return controllerMap.get(controller, 'invalid')

def jsfileMap(module):
    fileMap = config['jsFileMap']
    
    return fileMap.get(module,'invalid')


def parseJSFile(module, filename=""):
    #filename = 'C:\\Projects\\Film\\EventBuilder\\Dev\\EventBuilder\\Scripts\\eventbuilder\\'
    jsfile = jsfileMap(module)
    filename = filename + jsfile
    methods = []
    file = open(filename, 'r')
    for line in file:
        if line.find(config.js-url-prop-begin) >= 0:
            for l in file:
                if l.find(config.js-url-prop-end) >= 0:
                    break
                else:
                    ritems = l.split('/')
                    ritems.reverse()
                    name = ritems[0].split("'")[0]
                    methods.append(name)
    
    file.close()

    return methods       


def parseController(mod,jsRefMethods,filename=""):
    #filename = 'C:\\Projects\\Film\\EventBuilder\\Dev\\EventBuilder\\Controllers\\'
    controllerFile = controllerToFile(mod)
    filename = filename + controllerFile
    
    actionMethods = []
    file = open(filename,'r')
    for line in file:
        if line.find('public ActionResult') > 0:
            item = line.strip().split(' ')[2]
            method = item.split('(')[0]
            actionMethods.append(method)
    
    file.close()

    return actionMethods


def unreferencedMethods(jsRefMethods, actionMethods):
    refmethods = []
    unrefmethods = []
    for jmethod in jsRefMethods:
        #Remove the referenced methods
        if jmethod in actionMethods:
            actionMethods.remove(jmethod)
    #return the unreferenced methods
    #the referenced methods have been removed
    actionMethods.sort()
    return actionMethods


def printItems(items):
    for item in items:
        print(item)


def main(module):
    #config = getConfigs()
    jmethods = parseJSFile(module,config["js-path"])
    #print('JavaScript Methods')
    #printItems(jmethods)
    actionMethods = parseController(module,jmethods,config["cs-path"])
    #print('Action Methods')
    #printItems(actionMethods)
    unrefMethods = unreferencedMethods(jmethods,actionMethods)
    print('Unreference Controller Methods')
    printItems(unrefMethods)

if __name__ == '__main__':
    #file = r"C:\Projects\Film\EventBuilder\Dev\EventBuilder\Scripts\eventbuilder\eventbuilder.venues.js"
    if len(sys.argv) < 2:
        print("""\
           Usage: python parsefile.py module_name
                module_name    is associated with the JavaScript and Controller files.
           """)
    else:
        module = sys.argv[1]
        main(module)

