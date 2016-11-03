import sys

def controllerToFile(controller):
    controllerMap = {
        'venues': 'VenuesController.cs',
        'events': 'EventsController.cs',
        'contacts': 'ContactsController.cs',
        'seating': 'SeatingController.cs',
        'invitees': 'InviteesController.cs'
    }

    return controllerMap.get(controller, 'invalid')

def jsfileMap(module):
    fileMap = {
        'venues': 'eventbuilder.venues.js',
        'events': 'eventbuilder.events.js',
        'contacts': 'eventbuilder.contacts.js',
        'seating': 'eventbuilder.seating.js',
        'invitees': 'eventbuilder.invitees.js'
    }

    return fileMap.get(module,'invalid')


def parseJSFile(module):
    filename = 'C:\\Projects\\Film\\EventBuilder\\Dev\\EventBuilder\\Scripts\\eventbuilder\\'
    jsfile = jsfileMap(module)
    filename = filename + jsfile
    methods = []
    file = open(filename, 'r')
    for line in file:
        if line.find(', urls: {') >= 0:
            for l in file:
                if l.find('}') >= 0:
                    break
                else:
                    ritems = l.split('/')
                    ritems.reverse()
                    name = ritems[0].split("'")[0]
                    methods.append(name)
    
    file.close()

    return methods       


def parseController(mod,jsRefMethods):
    filename = 'C:\\Projects\\Film\\EventBuilder\\Dev\\EventBuilder\\Controllers\\'
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
    return actionMethods


def printItems(items):
    for item in items:
        print(item)


def main(module):
    jmethods = parseJSFile(module)
    #print('JavaScript Methods')
    #printItems(jmethods)
    actionMethods = parseController(module,jmethods)
    #print('Action Methods')
    #printItems(actionMethods)
    unrefMethods = unreferencedMethods(jmethods,actionMethods)
    print('Unreference Controller Methods')
    printItems(unrefMethods)

if __name__ == '__main__':
    #file = "C:\Projects\Film\EventBuilder\Dev\EventBuilder\Scripts\eventbuilder\eventbuilder.venues.js"
    module = sys.argv[1]
    main(module)
    #for n in parseFile(file):
    #    print(n)

