import presalytics
import presalytics.lib.tools.workflows
import presalytics.cli

outline = presalytics.cli._load_file('story.yaml')

presalytics.lib.tools.workflows.push_outline(outline)