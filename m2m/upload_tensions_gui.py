# Python imports
from tkinter import Tk, Frame, RIDGE, Button, Entry, OptionMenu, Label, StringVar, NORMAL, DISABLED
import tkinter.filedialog as File
import tkinter.font as Font
from tkterminal import Terminal
from tktooltip import ToolTip

# Default variables - these should NEVER be changed!
upload_script   = 'C:/DUNE/bin/m2m/upload_tensions.py'
file_location   = 'C:/DUNE/bin/T01-Winder/src/winder/Data/APA'
python_location = 'C:/DUNE/bin/Python312/python.exe'
apaLayers       = ['X', 'V', 'U', 'G']

# Input variables - these are picked up from the GUI
csvFile   = ''
apaLayer  = ''
action_id = ''

# Internal variables - these are used to keep track of various script-level global variables and objects
gui_buttons   = []
terminal      = None
terminalState = 'None'


###############################
## Setter callback functions ##
###############################
def callback_browseFiles():
    filename = File.askopenfilename(initialdir = file_location, title = 'Select Input File ...', filetypes = (('.csv files', '*.csv'), ('Python files', '.py')))
    strng_csvFile.set(filename)

    
def callback_setCSVFile(input_string):
    global csvFile
    csvFile = input_string.get()


def callback_setAPALayer(input_string):
    global apaLayer
    apaLayer = input_string.get()


def callback_setActionID(input_string):
    global action_id
    action_id = input_string.get()


##################################
## Processor callback functions ##
##################################
def callback_startUpload():
    global terminalState
    
    # When an upload is in progress, disable the 'START' button to stop users from interfering
    gui_buttons[0]['state'] = DISABLED
    
    # Reset the terminal state (this doesn't change the ACTUAL state of the terminal itself ... it just clears the display and resets any tracked state variables left over from a previous upload)
    terminalState = 'None'
    
    # Construct and run the upload command in the terminal
    command = f'{python_location} "{upload_script}" "{csvFile}" {apaLayer} {action_id}'
    
    terminal.clear()
    terminal.run_command(command)
    
    # Check if the terminal still has a process running ... i.e. is not in a 'NORMAL' state (by design, a terminal is disabled [state = 'DISABLED'] when a process is running)
    # If there is a process still running, wait for a small amount of time, and then recheck the current terminal state (i.e. run the callback function)
    # If the process is finished, re-enable the 'START' button
    if terminalState != NORMAL:
        gui_buttons[0].after(500, callback_checkProgress)
    else:
        gui_buttons[0]['state'] = NORMAL


def callback_checkProgress():
    global terminalState
    
    # Update the current terminal state
    terminalState = terminal['state']
    
    # Check if the terminal still has a process running ... i.e. is not in a 'NORMAL' state (by design, a terminal is disabled [state = 'DISABLED'] when a process is running)
    # If there is a process still running, wait for a small amount of time, and then recheck the current terminal state (i.e. run the callback function)
    # If the process is finished, re-enable the 'START' button
    if terminalState != NORMAL:
        gui_buttons[0].after(500, callback_checkProgress)
    else:
        gui_buttons[0]['state'] = NORMAL


###########################################
## Main function - GUI builder and setup ##
###########################################
if __name__ == '__main__':
    # Define the main GUI window, and set some basic parameters
    window = Tk()
    window.title('DUNE APA Tension Measurements Upload Tool')
    window.geometry('900x175')
    window.configure(bg = 'CadetBlue')
    window.columnconfigure([0, 1, 2], minsize = 40, weight = 0)
    
    # Define some custom fonts
    fonts = { 'lrg': Font.Font(root = window, family = 'Calibri', size = 16),
              'sml': Font.Font(root = window, family = 'Calibri', size = 12),
              'trm': Font.Font(root = window, family = 'TkFixedFont', size = 8) }
    
    # Define an element for setting the input .csv file name
    frame_csvFile = Frame(master = window, bg = 'grey', borderwidth = 2, relief = RIDGE)
    frame_csvFile.grid(row = 1, column = 0, sticky = 'w', padx = 5, pady = 2, columnspan = 2)
    
    strng_csvFile = StringVar()
    strng_csvFile.trace('w', lambda name, index, mode, strng_csvFile = strng_csvFile: callback_setCSVFile(strng_csvFile))
    
    entry_csvFile = Entry(master = frame_csvFile, bg = 'white', font = fonts['sml'], width = 43, textvariable = strng_csvFile)
    entry_csvFile.grid(row = 0, column = 1, sticky = 'w', padx = 5, pady = 2)
    
    btton_csvFile = Button(master = frame_csvFile, bg = 'grey', font = fonts['sml'], width = 10, text = 'Input File: ', fg = 'black', state = NORMAL, command = lambda: callback_browseFiles())
    btton_csvFile.grid(row = 0, column = 0, sticky = 'e', padx = 2, pady = 2)
    
    ToolTip(entry_csvFile, msg = 'Please select a .csv file containing the tension measurement that you wish to upload to the APA DB')
    
    # Define an element for setting the target action ID
    frame_actionId = Frame(master = window, bg = 'grey', borderwidth = 2, relief = RIDGE)
    frame_actionId.grid(row = 2, column = 0, sticky = 'w', padx = 5, pady = 2)
    
    label_actionId = Label(master = frame_actionId, bg = 'grey', font = fonts['sml'], text = 'Action ID: ')
    label_actionId.grid(row = 0, column = 0, sticky = 'e', padx = 5, pady = 2)
    
    strng_actionId = StringVar()
    strng_actionId.trace('w', lambda name, index, mode, strng_actionId = strng_actionId: callback_setActionID(strng_actionId))
    
    entry_actionId = Entry(master = frame_actionId, bg = 'white', font = fonts['sml'], width = 25, textvariable = strng_actionId)
    entry_actionId.grid(row = 0, column = 1, sticky = 'w', padx = 5, pady = 2)
    
    ToolTip(entry_actionId, msg = 'Please enter the action ID of the (existing) single layer tension measurements action that you wish to add measurements to')
    
    # Define an element for setting the APA layer
    frame_apaLayer = Frame(master = window, bg = 'grey', borderwidth = 2, relief = RIDGE)
    frame_apaLayer.grid(row = 2, column = 1, sticky = 'e', padx = 5, pady = 0)
    
    label_apaLayer = Label(master = frame_apaLayer, bg = 'grey', font = fonts['sml'], text = 'Layer: ')
    label_apaLayer.grid(row = 0, column = 0, sticky = 'e', padx = 5, pady = 0)
    
    strng_apaLayer = StringVar()
    strng_apaLayer.trace('w', lambda name, index, mode, strng_apaLayer = strng_apaLayer: callback_setAPALayer(strng_apaLayer))
    
    omenu_apaLayer = OptionMenu(frame_apaLayer, strng_apaLayer, *apaLayers)
    omenu_apaLayer.grid(row = 0, column = 1, sticky = 'w', padx = 5, pady = 0)
    
    # Define a terminal for running the upload command
    frame_terminal = Frame(master = window)
    frame_terminal.grid(row = 0, column = 2, padx = 5, pady = 8, rowspan = 3)
    
    terml_terminal = Terminal(master = frame_terminal, font = fonts['trm'], bg = 'black', width = 69, height = 11, fg = 'white')
    terml_terminal.grid(row = 0, column = 0)
    terml_terminal.shell = True
    terml_terminal.basename = 'upload_tool $'
    
    terminal = terml_terminal
    
    # Define a button to start the upload
    frame_startButton = Frame(master = window, bg = 'black', borderwidth = 2, relief = RIDGE)
    frame_startButton.grid(row = 0, column = 0, sticky = 'w', padx = 5, pady = 5, columnspan = 2)
    
    btton_startButton = Button(master = frame_startButton, bg = 'grey', font = fonts['lrg'], width = 40, text = 'START TENSION MEASUREMENTS UPLOAD', fg = 'black', state = NORMAL, command = callback_startUpload)
    btton_startButton.grid(row = 0, column = 0, sticky = 'w', padx = 2, pady = 2)
    
    gui_buttons.append(btton_startButton)
    
    # Run the main 'event' loop - that is, wait for user interactions and perform the specified callbacks as and when appropriate
    window.mainloop()

